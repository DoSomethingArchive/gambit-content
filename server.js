/* eslint no-use-before-define: 0 */

// TODO: refactor to implement best practices turned off here
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

require('newrelic'); // eslint-disable-line strict
// @see https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration
// New Relic is required on first line, otherwise would declare 'use strict' for line 1 per eslint

// Setup concurrency
const throng = require('throng');

const WORKERS = process.env.WEB_CONCURRENCY || 1;

// Wrapper around require to set relative path at app root
global.rootRequire = function (name) {
  return require(`${__dirname}/${name}`);
};

// DB URI
const DB_URI = process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder';

/**
 * Load logger.
 */
const logger = require('winston');
require('winston-mongodb').MongoDB; // eslint-disable-line no-unused-expressions

const WINSTON_LEVEL = process.env.LOGGING_LEVEL || 'info';
logger.configure({
  transports: [
    new logger.transports.Console({
      prettyPrint: true,
      colorize: true,
      level: WINSTON_LEVEL,
    }),
    new logger.transports.MongoDB({
      db: DB_URI,
      level: WINSTON_LEVEL,
    }),
  ],
});

// Initialize Concurrency
throng({
  workers: WORKERS,
  lifetime: Infinity,
  master: startMaster,
  start: startWorker,
});

function startMaster() {
  // will run only once
  logger.debug('Master called');
}

function startWorker(id) {
  logger.info(`Started worker ${id}`);

  const express = require('express');
  const Profiler = require('./lib/tools/profiler');
  const Uploader = require('./lib/tools/uploader');

  /**
   * Profiler setup
   */

  if (process.env.V8_PROFILER_ENABLED &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY) {
    logger.info('HEAP SNAPSHOT PROFILER IS ENABLED.');

    const profiler = new Profiler({
      interval: process.env.V8_PROFILER_DEFAULT_INTERVAL_MS || 3600000,
      tag: `worker #${id}`,
      extension: 'heapsnapshot',
      namePrefix: process.env.V8_PROFILER_NAME_PREFIX || 'v8.heap.snapshot',
    });
    const uploader = new Uploader({
      params: {
        Bucket: process.env.V8_PROFILER_S3_BUCKET || 'local-v8-profiler.dosomething.org',
        ContentType: 'binary/octet-stream',
        ACL: 'public-read',
      },
    });

    /**
     * The profiler has fired the snapshotCreated event, now we can process the snapshot
     */
    profiler.on('snapshotCreated', (snapshot) => {
      const fileName = snapshot.getHeader().title;
      const uploadStream = uploader.getUploadStream(fileName);

      /**
       * This is the multipart stream that will upload the snapshot to S3
       */
      uploadStream
        .on('error', (error) => {
          logger.info(`Upload Stream error: ${error}`);
          snapshot.delete();
        })
        .on('uploaded', (details) => {
          logger.debug(`Snapshot upload successful. File name: ${details.Key}`);
          snapshot.delete();
        });

      /**
       * This is the snapshot stream that will pipe the serialized version of the
       * snapshot to the uploadStream
       */
      snapshot
        .export()
        .pipe(uploadStream)
        .on('error', error => logger.info(`Snapshot error: ${error}`));
    });
    profiler.start();
  }

  const favicon = require('serve-favicon');
  const path = require('path');

  app = express();
  app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

  const timeout = require('connect-timeout');
  const helpers = require('./lib/helpers');
  const timeoutNumSeconds = helpers.getGambitTimeoutNumSeconds();
  // Set respond to false so we can send our own 504 status.
  // Note: Our routes will need to check for req.timedout.
  // @see https://github.com/expressjs/timeout/tree/v1.8.0#api
  app.use(timeout(`${timeoutNumSeconds}s`, { respond: false }));

  const bodyParser = require('body-parser');
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // current worker
  app.locals.currentWorker = id;
  // Expose which worker is handling request through middleware
  app.use((req, res, next) => {
    logger.info(`Request handled by worker ${app.locals.currentWorker}`);
    next();
  });

  require('./app/routes');

  const mongoose = require('mongoose');
  mongoose.Promise = require('bluebird');

  // Based on the answers of this Stack Overflow thread
  // http://stackoverflow.com/questions/38486384/mongodb-connection-to-mongolab-timing-out-in-nodejs-on-heroku
  const connOpts = {
    server: {
      socketOptions: {
        keepAlive: parseInt(process.env.DB_KEEPALIVE, 10) || 300000,
        connectTimeoutMS: parseInt(process.env.DB_TIMEOUT_MS, 10) || 30000,
      },
    },
    replset: {
      socketOptions: {
        keepAlive: parseInt(process.env.DB_KEEPALIVE, 10) || 300000,
        connectTimeoutMS: parseInt(process.env.DB_TIMEOUT_MS, 10) || 30000,
      },
    },
  };

  mongoose.connect(DB_URI, connOpts);
  const conn = mongoose.connection;
  conn.on('connected', () => {
    logger.info(`conn.readyState:${conn.readyState}`);
    const port = process.env.PORT || 5000;

    return app.listen(port, () => {
      logger.info(`Gambit is listening on port:${port} env:${process.env.NODE_ENV}.`);
    });
  });
}
