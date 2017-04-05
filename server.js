/* eslint no-use-before-define: 0 */
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
const winston = require('winston');
require('winston-mongodb').MongoDB; // eslint-disable-line no-unused-expressions
const WINSTON_LEVEL = process.env.LOGGING_LEVEL || 'info';

const logger = new (winston.Logger)({
  levels: {
    verbose: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
  },
  transports: [
    new winston.transports.Console({ prettyPrint: true, colorize: true, level: WINSTON_LEVEL }),
    new winston.transports.MongoDB({ db: DB_URI, level: WINSTON_LEVEL }),
  ],
  exceptionHandlers: [
    new winston.transports.Console({ prettyPrint: true, colorize: true }),
    new winston.transports.MongoDB({ db: DB_URI }),
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

  app = express();

  const bodyParser = require('body-parser');
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  // TODO: I don't think we need this?
  app.use(require('connect-multiparty')());
  // Also unsure if this is used:
  const errorHandler = require('errorhandler');
  app.use(errorHandler());

  // current worker
  app.locals.currentWorker = id;

  // logger
  app.locals.logger = logger;

  if (!app.locals.logger) {
    process.exit(1);
  }

  // Expose which worker is handling request through middleware
  app.use((req, res, next) => {
    app.locals.logger.info(`Request handled by worker ${app.locals.currentWorker}`);
    next();
  });

  /**
   * Load stathat.
   */
  const stathat = require('stathat');

  app.locals.stathat = function (statName) {
    const key = process.env.STATHAT_EZ_KEY;
    if (!key) {
      logger.warn('STATHAT_EZ_KEY undefined');

      return;
    }
    const appName = process.env.STATHAT_APP_NAME || 'gambit';
    const stat = `${appName} - ${statName}`;
    logger.debug(`stathat: ${stat}`);

    // Bump count of stat by 1.
    stathat.trackEZCount(key, stat, 1, status => logger.verbose(`stathat:${stat} ${status}`));
  };

  app.locals.stathatError = function (statName, error) {
    if (error.status) {
      app.locals.stathat(`${statName} ${error.status}`);
    } else {
      app.locals.stathat(`${statName} failed`);
    }
  };

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
