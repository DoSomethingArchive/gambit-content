'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const logger = rootRequire('lib/logger');

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
 * Loads app.locals.campaigns to use for CampaignBot conversations.
 */
function loadCampaigns(stringCampaignIds) {
  logger.debug(`loadCampaigns:[${stringCampaignIds}]`);
  app.locals.campaigns = {};

  return app.locals.clients.phoenix.Campaigns
    .index({ ids: stringCampaignIds })
    .then((campaigns) => {
      return campaigns.forEach((campaign) => {
        logger.info(`loaded app.locals.campaigns[${campaign.id}] from phoenix`);
        app.locals.campaigns[campaign.id] = campaign;
      });
    });
}

/**
 * Loads app.locals.clients for networking requests.
 */
function loadClients() {
  app.locals.clients = {};

  const NorthstarClient = require('@dosomething/northstar-js');
  app.locals.clients.northstar = new NorthstarClient({
    baseURI: process.env.DS_NORTHSTAR_API_BASEURI,
    apiKey: process.env.DS_NORTHSTAR_API_KEY,
  });

  const PhoenixClient = require('@dosomething/phoenix-js');
  app.locals.clients.phoenix = new PhoenixClient({
    baseURI: process.env.DS_PHOENIX_API_BASEURI,
    username: process.env.DS_PHOENIX_API_USERNAME,
    password: process.env.DS_PHOENIX_API_PASSWORD,
  });

  const loaded = app.locals.clients.northstar && app.locals.clients.phoenix;

  return loaded;
}

/**
 * Loads map of config content as app.locals.configs object instead using Mongoose find queries
 * e.g. app.locals.configs.campaign[32].title, app.locals.configs.campaignBots[41].msg_ask_why
 */
function loadConfigs(uri) {
  app.locals.configs = {};

  const conn = mongoose.createConnection(uri);
  conn.on('connected', () => {
    logger.info(`apps.locals.configs readyState:${conn.readyState}`);
  });

  /* eslint-disable max-len*/
  const models = {
    campaignBots: rootRequire('api/models/config/CampaignBot')(conn),
    donorsChooseBots: rootRequire('api/models/config/DonorsChooseBot')(conn),
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
 * Loads operation models as app.locals.db object.
 */
function loadDb(uri) {
  const conn = mongoose.createConnection(uri);
  conn.on('connected', () => {
    logger.info(`apps.locals.db readyState:${conn.readyState}`);
  });

  app.locals.db = {
    donorsChooseDonations: rootRequire('api/models/DonorsChooseDonation')(conn),
    legacyReportbacks: rootRequire('api/legacy/reportback/reportbackModel')(conn),
    reportbackSubmissions: rootRequire('api/models/ReportbackSubmission')(conn),
    signups: rootRequire('api/models/Signup')(conn),
    users: rootRequire('api/models/User')(conn),
  };

  return app.locals.db;
}

/**
 * Loads operation models as app.locals.db object.
 */
module.exports.load = function () {
  if (!loadClients()) {
    return false;
  }

  const campaignIds = process.env.CAMPAIGNBOT_CAMPAIGNS;
  const configUri = process.env.CONFIG_DB_URI || 'mongodb://localhost/config';
  const dbUri = process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder';
  const locals = [loadCampaigns(campaignIds), loadConfigs(configUri), loadDb(dbUri)];

  return Promise.all(locals).then(() => {
    app.locals.controllers = {};

    const CampaignBotController = rootRequire('api/controllers/CampaignBotController');
    // TODO: Support multiple campaignBots, to allow campaigns to override default message copy.
    const campaignBot = app.locals.configs.campaignBots[process.env.CAMPAIGNBOT_ID];
    app.locals.controllers.campaignBot = new CampaignBotController(campaignBot);
    let loaded = app.locals.controllers.campaignBot;
    if (app.locals.controllers.campaignBot) {
      logger.debug('app.locals.controllers loaded campaignBot');
    }

    const DonorsChooseBotController = rootRequire('api/controllers/DonorsChooseBotController');
    const donorsChooseBot = app.locals.configs.donorsChooseBots[process.env.DONORSCHOOSEBOT_ID];
    app.locals.controllers.donorsChooseBot = new DonorsChooseBotController(donorsChooseBot);
    loaded = loaded && app.locals.controllers.DonorsChooseBot;
    if (app.locals.controllers.donorsChooseBot) {
      logger.debug('app.locals.controllers loaded donorsChooseBot');
    }

    const SlothBotController = rootRequire('api/controllers/SlothBotController');
    app.locals.controllers.slothBot = new SlothBotController();
    loaded = loaded && app.locals.controllers.slothBot;
    if (app.locals.controllers.slothBot) {
      logger.debug('app.locals.controllers loaded slothBot');
    }

    return loaded;
  });
};
