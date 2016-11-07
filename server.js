require('newrelic'); // eslint-disable-line strict
// @see https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration
// New Relic is required on first line, otherwise would declare 'use strict' for line 1 per eslint

// Wrapper around require to set relative path at app root
global.rootRequire = function (name) {
  return require(`${__dirname}/${name}`);
};

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

const DB_URI = process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder';

/**
 * Load logger.
 */
const winston = require('winston');
require('winston-mongodb').MongoDB; // eslint-disable-line no-unused-expressions
const WINSTON_LEVEL = process.env.LOGGING_LEVEL || 'info';

app.locals.logger = new (winston.Logger)({
  levels: {
    verbose: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
  },
  transports: [
    new winston.transports.Console({ prettyPrint: true, colorize: true, level: WINSTON_LEVEL }),
    new winston.transports.MongoDB({ dbUri: DB_URI, level: WINSTON_LEVEL }),
  ],
  exceptionHandlers: [
    new winston.transports.Console({ prettyPrint: true, colorize: true }),
    new winston.transports.MongoDB({ dbUri: DB_URI }),
  ],
});
if (!app.locals.logger) {
  process.exit(1);
}
const logger = app.locals.logger;

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

  // Bump count of stat by 1.
  stathat.trackEZCount(key, stat, 1, status => logger.verbose(`stathat ${stat}:${status}`));
};

if (!process.env.CAMPAIGNBOT_CAMPAIGNS) {
  app.locals.logger.error('process.env.CAMPAIGNBOT_CAMPAIGNS undefined');
  process.exit(1);
}

const loader = require('./config/locals');

require('./app/routes');

/**
 * Load models.
 */
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const conn = mongoose.createConnection(DB_URI);
app.locals.db = loader.getModels(conn);

/**
 * Load clients.
 */
app.locals.clients = {};

const NorthstarClient = require('@dosomething/northstar-js');
app.locals.clients.northstar = new NorthstarClient({
  baseURI: process.env.DS_NORTHSTAR_API_BASEURI,
  apiKey: process.env.DS_NORTHSTAR_API_KEY,
});

if (!app.locals.clients.northstar) {
  logger.error('app.locals.clients.northstar undefined');
  process.exit(1);
}

const PhoenixClient = require('@dosomething/phoenix-js');
app.locals.clients.phoenix = new PhoenixClient({
  baseURI: process.env.DS_PHOENIX_API_BASEURI,
  username: process.env.DS_PHOENIX_API_USERNAME,
  password: process.env.DS_PHOENIX_API_PASSWORD,
});

if (!app.locals.clients.phoenix) {
  logger.error('app.locals.clients.phoenix undefined');
  process.exit(1);
}


conn.on('connected', () => {
  logger.info(`conn.readyState:${conn.readyState}`);

  /**
   * Load campaigns.
   */
  app.locals.campaigns = {};
  app.locals.keywords = {};

  const loadCampaigns = app.locals.db.campaigns
    .lookupByIDs(process.env.CAMPAIGNBOT_CAMPAIGNS)
    .then((campaigns) => {
      logger.debug(`app.locals.db.campaigns.lookupByIDs found ${campaigns.length} campaigns`);

      return campaigns.forEach((campaign) => {
        const campaignID = campaign._id;
        app.locals.campaigns[campaignID] = campaign;
        logger.debug(`loaded app.locals.campaigns[${campaignID}]`);

        if (!campaign.mobilecommons_group_doing || !campaign.mobilecommons_group_completed) {
          campaign.createMobileCommonsGroups();
        }

        if (campaign.keywords.length < 1) {
          logger.warn(`no keywords defined for campaign:${campaignID}`);
        }
        campaign.keywords.forEach((campaignKeyword) => {
          const keyword = campaignKeyword.toLowerCase();
          app.locals.keywords[keyword] = campaignID;
          logger.debug(`loaded app.locals.db.keywords[${keyword}]:${campaignID}`);
        });
      });
    })
    .catch(err => logger.error(err));

  /**
   * Load controllers.
   */
  app.locals.controllers = {};

  const campaignBotId = process.env.CAMPAIGNBOT_ID || 41;
  const loadCampaignBot = loader.loadBot('campaignbot', campaignBotId)
    .then((bot) => {
      app.locals.campaignBot = bot;
      const CampaignBotController = rootRequire('app/controllers/CampaignBotController');
      app.locals.controllers.campaignBot = new CampaignBotController(bot);
      logger.info('loaded app.locals.controllers.campaignBot');

      return app.locals.controllers.campaignBot;
    })
    .catch(err => logger.error(err.message));

  const donorsChooseBotId = process.env.DONORSCHOOSEBOT_ID || 31;
  const loadDonorsChooseBot = loader.loadBot('donorschoosebot', donorsChooseBotId)
    .then((bot) => {
      app.locals.donorsChooseBot = bot;
      // TODO: Deprecate DonorsChooseBotController entirely once donorschoosebot endpoint is live.
      const DonorsChooseBotController = rootRequire('app/controllers/DonorsChooseBotController');
      app.locals.controllers.donorsChooseBot = new DonorsChooseBotController(bot);
      logger.info('loaded app.locals.controllers.donorsChooseBot');

      return app.locals.controllers.donorsChooseBot;
    })
    .catch(err => logger.error(err.message));

  /**
   * Load legacy configs.
   */
  app.locals.configs = {};
  const uriConfig = process.env.CONFIG_DB_URI || 'mongodb://localhost/config';
  const connConfig = mongoose.createConnection(uriConfig);
  const legacyConfigs = loader.loadLegacyConfigs(connConfig);

  const legacyPhoenix = require('./legacy/lib/phoenix')();
  const username = process.env.DS_PHOENIX_API_USERNAME;
  const password = process.env.DS_PHOENIX_API_PASSWORD;
  const legacyAuth = legacyPhoenix.userLogin(username, password, (err, response) => {
    if (err) {
      logger.error(err);
    }
    if (response && response.statusCode === 200) {
      logger.info('Successfully logged in to %s Phoenix API.', process.env.NODE_ENV);
    }
  });

  /**
   * Start server.
   */
  Promise.all([loadCampaigns, loadCampaignBot, loadDonorsChooseBot, legacyConfigs, legacyAuth])
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
