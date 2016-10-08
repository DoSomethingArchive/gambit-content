'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const logger = rootRequire('lib/logger');
const gambitJunior = rootRequire('lib/gambit-junior');

/**
 * Returns object with a data property, containing a hash map of models for modelName by model id.
 */
function getModelMap(configName, model) {
  logger.verbose(`loading ${configName}`);

  const modelMap = {};

  return model.find({}).exec().then((docs) => {
    docs.forEach((doc) => {
      if (configName === 'legacyReportbacks') {
        // Legacy reportback controller loads its config based by endpoint instead of _id.
        modelMap[doc.endpoint] = doc;
      } else {
        modelMap[doc._id] = doc;
      }
    });

    return {
      name: configName,
      count: docs.length,
      data: modelMap,
    };
  });
}

/**
 * Upserts given Phoenix campaign to campaign model, saves to app.locals.campaign[campaign.id].
 */
function loadCampaign(campaign) {
  logger.debug(`loadCampaign:${campaign.id}`);

  const data = {
    status: campaign.status,
    tagline: campaign.tagline,
    title: campaign.title,
    rb_confirmed: campaign.reportbackInfo.confirmationMessage,
    rb_noun: campaign.reportbackInfo.noun,
    rb_verb: campaign.reportbackInfo.verb,
  };

  return app.locals.db.campaigns
    .findOneAndUpdate({ _id: campaign.id }, data, { upsert: true, new: true })
    .exec()
    .then((campaignDoc) => {
      logger.debug(`saved campaign:${campaignDoc._id}`);
      app.locals.campaigns[campaign.id] = campaignDoc;
      if (campaignDoc.keyword) {
        app.locals.keywords[campaignDoc.keyword.toUpperCase()] = campaign.id;
      }

      return campaignDoc;
    })
    .catch(err => logger.error(err));
}

/**
 * Loads app.locals.controllers.campaignBot from Gambit Jr API.
 */
function loadCampaignBotController() {
  const campaignBotId = process.env.CAMPAIGNBOT_ID;

  return gambitJunior
    .get('campaignbots', campaignBotId)
    .then((campaignBot) => {
      logger.debug(`gambitJunior found campaignBot:${campaignBotId}`);

      const CampaignBotController = rootRequire('api/controllers/CampaignBotController');
      app.locals.controllers.campaignBot = new CampaignBotController(campaignBot);
      logger.info('loaded app.locals.controllers.campaignBot');

      return app.locals.controllers.campaignBot;
    });
}

/**
 * Loads app.locals.campaigns from DS API.
 */
function loadCampaigns() {
  app.locals.campaigns = {};
  app.locals.keywords = {};

  const campaignIds = process.env.CAMPAIGNBOT_CAMPAIGNS;
  logger.debug(`loadCampaigns:${campaignIds}`);

  return app.locals.clients.phoenix.Campaigns
    .index({ ids: campaignIds })
    .then((campaigns) => {
      logger.debug(`loadCampaigns found ${campaigns.length} campaigns`);

      return campaigns.map(campaign => loadCampaign(campaign));
    });
}

/**
 * Loads app.locals.controllers.donorsChooseBot from Gambit Jr API.
 */
function loadDonorsChooseBotController() {
  const donorsChooseBotId = process.env.DONORSCHOOSEBOT_ID;
  logger.debug(`loadDonorsChooseBot:${donorsChooseBotId}`);

  return gambitJunior
    .get('donorschoosebots', donorsChooseBotId)
    .then((donorsChooseBot) => {
      logger.debug(`gambitJunior found donorsChooseBot:${donorsChooseBotId}`);

      const DonorsChooseBotController = rootRequire('api/controllers/DonorsChooseBotController');
      app.locals.controllers.donorsChooseBot = new DonorsChooseBotController(donorsChooseBot);
      logger.info('loaded app.locals.controllers.donorsChooseBot');

      return app.locals.controllers.donorsChooseBot;
    });
}

/**
 * Loads operation models as app.locals.db object.
 */
function loadDb() {
  const uri = process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder';
  const conn = mongoose.createConnection(uri);
  conn.on('connected', () => {
    logger.info(`apps.locals.db readyState:${conn.readyState}`);
  });

  app.locals.db.donorsChooseDonations = rootRequire('api/models/DonorsChooseDonation')(conn);
  app.locals.db.legacyReportbacks = rootRequire('api/legacy/reportback/reportbackModel')(conn);
  app.locals.db.reportbackSubmissions = rootRequire('api/models/ReportbackSubmission')(conn);
  app.locals.db.signups = rootRequire('api/models/Signup')(conn);
  app.locals.db.users = rootRequire('api/models/User')(conn);

  return app.locals.db;
}

/**
 * Loads map of config content as app.locals.configs object instead using Mongoose find queries
 * e.g. app.locals.configs.campaign[32].title, app.locals.configs.campaignBots[41].msg_ask_why
 */
function loadLegacyConfigs() {
  app.locals.configs = {};

  const conn = app.locals.conn.config;
  /* eslint-disable max-len*/
  const models = {
    // TBDeleted.
    legacyReportbacks: rootRequire('api/legacy/reportback/reportbackConfigModel')(conn),
    legacyStartCampaignTransitions: rootRequire('api/legacy/ds-routing/config/startCampaignTransitionsConfigModel')(conn),
    legacyYesNoPaths: rootRequire('api/legacy/ds-routing/config/yesNoPathsConfigModel')(conn),
  };
  /* eslint-enable max-len*/

  const promises = [];
  Object.keys(models).forEach((modelName) => {
    const promise = getModelMap(modelName, models[modelName]);
    promises.push(promise);
  });

  return Promise.all(promises).then((modelMaps) => {
    modelMaps.forEach((modelMap) => {
      app.locals.configs[modelMap.name] = modelMap.data;
      logger.debug(`app.locals.configs loaded ${modelMap.count} ${modelMap.name}`);
    });
  });
}

/**
 * Loads app.locals.controllers.slothBot for Season 2.
 */
function loadSlothBotController() {
  const SlothBotController = rootRequire('api/controllers/SlothBotController');
  app.locals.controllers.slothBot = new SlothBotController();
  logger.info('loaded app.locals.controllers.slothBot');

  return app.locals.controllers.slothBot;
}

/**
 * Loads required app.locals properties.
 */
module.exports.load = function () {
  app.locals.clients = {};

  const NorthstarClient = require('@dosomething/northstar-js');
  app.locals.clients.northstar = new NorthstarClient({
    baseURI: process.env.DS_NORTHSTAR_API_BASEURI,
    apiKey: process.env.DS_NORTHSTAR_API_KEY,
  });
  if (!app.locals.clients.northstar) {
    logger.error('app.locals.clients.northstar undefined');

    return false;
  }

  const PhoenixClient = require('@dosomething/phoenix-js');
  app.locals.clients.phoenix = new PhoenixClient({
    baseURI: process.env.DS_PHOENIX_API_BASEURI,
    username: process.env.DS_PHOENIX_API_USERNAME,
    password: process.env.DS_PHOENIX_API_PASSWORD,
  });
  if (!app.locals.clients.phoenix) {
    logger.error('app.locals.clients.phoenix undefined');

    return false;
  }

  app.locals.conn = {};
  app.locals.db = {};

  const configUri = process.env.CONFIG_DB_URI || 'mongodb://localhost/config';
  app.locals.conn.config = mongoose.createConnection(configUri);
  app.locals.db.campaigns = rootRequire('api/models/Campaign')(app.locals.conn.config);

  // TODO: We don't want to start listening in Express until we have mongo connection and loaded
  // campaigns. Same for our ops connection -- @see loadDb
  app.locals.conn.config.on('connected', () => {
    loadCampaigns();
    logger.info(`app.locals.conn.config readyState:${app.locals.conn.config.readyState}`);
  });

  app.locals.controllers = {};
  const promises = [
    loadCampaignBotController(),
    loadDb(),
    loadDonorsChooseBotController(),
    loadLegacyConfigs(),
    loadSlothBotController(),
  ];

  return Promise.all(promises);
};
