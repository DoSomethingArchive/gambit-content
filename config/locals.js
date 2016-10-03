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
    campaigns: rootRequire('api/models/campaign/Campaign')(conn),
    campaignBots: rootRequire('api/models/campaign/CampaignBot')(conn),
    chatbotMobileCommonsCampaigns: rootRequire('api/models/ChatbotMobileCommonsCampaign')(conn),
    donorsChooseBots: rootRequire('api/models/donation/DonorsChooseBot')(conn),
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
    donorsChooseDonations: rootRequire('api/models/donation/DonorsChooseDonation')(conn),
    legacyReportbacks: rootRequire('api/legacy/reportback/reportbackModel')(conn),
    reportbackSubmissions: rootRequire('api/models/campaign/ReportbackSubmission')(conn),
    signups: rootRequire('api/models/campaign/Signup')(conn),
    users: rootRequire('api/models/User')(conn),
  };

  return app.locals.db;
}

/**
 * Loads operation models as app.locals.db object.
 */
module.exports.load = function () {
  const configUri = process.env.CONFIG_DB_URI || 'mongodb://localhost/config';
  const dbUri = process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder';
  const locals = [loadClients(), loadConfigs(configUri), loadDb(dbUri)];

  return Promise.all(locals).then(() => {
    const CampaignBotController = rootRequire('api/controllers/CampaignBotController');
    // TODO: Support multiple campaignBots, to allow campaigns to override default message copy.
    const campaignBot = app.locals.configs.campaignBots[process.env.CAMPAIGNBOT_ID];
    app.locals.campaignBot = new CampaignBotController(campaignBot);

    const DonorsChooseBotController = rootRequire('api/controllers/DonorsChooseBotController');
    const donorsChooseBot = app.locals.configs.donorsChooseBots[process.env.DONORSCHOOSEBOT_ID];
    const dcMocoId = process.env.DONORSCHOOSE_MOCO_CAMPAIGN_ID;
    const dcMocoCampaign = app.locals.configs.chatbotMobileCommonsCampaigns[dcMocoId];
    app.locals.donorsChooseBot = new DonorsChooseBotController(donorsChooseBot, dcMocoCampaign);

    const SlothBotController = rootRequire('api/controllers/SlothBotController');
    app.locals.slothBot = new SlothBotController();

    return true;
  });
};
