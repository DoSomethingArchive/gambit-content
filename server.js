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
  const Promise = require('bluebird');

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

  if (!process.env.CAMPAIGNBOT_CAMPAIGNS) {
    app.locals.logger.error('process.env.CAMPAIGNBOT_CAMPAIGNS undefined');
    process.exit(1);
  }

  app.locals.stathatError = function (statName, error) {
    if (error.status) {
      app.locals.stathat(`${statName} ${error.status}`);
    } else {
      app.locals.stathat(`${statName} failed`);
    }
  };

  require('./app/routes');

  const mongoose = require('mongoose');
  mongoose.Promise = global.Promise;
  mongoose.connect(DB_URI);
  const conn = mongoose.connection;
  conn.on('connected', () => {
    logger.info(`conn.readyState:${conn.readyState}`);

    // Load Campaign Messaging Groups.
    const Campaign = require('./app/models/Campaign');
    const loadCampaigns = Campaign.lookupByIds(process.env.CAMPAIGNBOT_CAMPAIGNS)
      .then((campaigns) => {
        logger.debug(`Campaign.lookupByIds found ${campaigns.length} campaigns`);

        return campaigns.forEach((campaign) => {
          logger.info(`Checking messaging groups for Campaign ${campaign._id}`);
          if (!campaign.mobilecommons_group_doing || !campaign.mobilecommons_group_completed) {
            campaign.findOrCreateMessagingGroups();
          }
        });
      })
      .catch(err => logger.error(err.message));

    // Start server.
    Promise.all([loadCampaigns])
      .then(() => {
        const port = process.env.PORT || 5000;

        return app.listen(port, () => {
          logger.info(`Gambit is listening on port:${port} env:${process.env.NODE_ENV}.`);
        });
      })
      .catch((err) => {
        logger.error(err.message);
        process.exit(1);
      });
  });
}
