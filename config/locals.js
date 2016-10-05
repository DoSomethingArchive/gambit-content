'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const superagent = require('superagent');
const logger = rootRequire('lib/logger');

const gambitJuniorUri = 'http://dev-gambit-jr.pantheonsite.io/wp-json/wp/v2';

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
 * Load app.locals.campaignBots from Gambit Jr API.
 */
function loadCampaignBots() {
  logger.debug('loadCampaignBots');
  app.locals.campaignBots = {};

  return superagent
    .get(`${gambitJuniorUri}/campaignbots/`)
    .then((res) => {
      logger.debug(`loadCampaignBots found ${res.body.length} campaignBots`);

      return res.body;
    })
    .then((campaignBots) => {
      const CampaignBotController = rootRequire('api/controllers/CampaignBotController');

      return campaignBots.forEach((campaignBot) => {
        app.locals.campaignBots[campaignBot.id] = new CampaignBotController(campaignBot);
        logger.debug(`loaded app.locals.campaignBots[${campaignBot.id}]`);
      });
    });
}

/**
 * Loads app.locals.donorsChooseBot from Gambit Jr API.
 */
function loadDonorsChooseBot(id) {
  logger.debug(`loadDonorsChooseBot:${id}`);

  return superagent
    .get(`${gambitJuniorUri}/donorschoosebots/${id}`)
    .then((res) => {
      const DonorsChooseBotController = rootRequire('api/controllers/DonorsChooseBotController');
      app.locals.controllers.donorsChooseBot = new DonorsChooseBotController(res.body);
      logger.debug(`loaded app.locals.donorsChooseBot (id:${id})`);

      return app.locals.controllers.donorsChooseBot;
    });
}

/**
 * Loads app.locals.campaigns from DS API.
 */
function loadCampaigns(stringCampaignIds) {
  logger.debug(`loadCampaigns:${stringCampaignIds}`);
  app.locals.campaigns = {};

  return app.locals.clients.phoenix.Campaigns
    .index({ ids: stringCampaignIds })
    .then((campaigns) => {
      logger.debug(`loadCampaigns found ${campaigns.length} campaigns`);

      return campaigns.forEach((campaign) => {
        logger.info(`loaded app.locals.campaigns[${campaign.id}]`);
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

  app.locals.controllers = {};

  const campaignIds = process.env.CAMPAIGNBOT_CAMPAIGNS;
  const configUri = process.env.CONFIG_DB_URI || 'mongodb://localhost/config';
  const dbUri = process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder';

  const promises = [loadCampaigns(campaignIds), loadConfigs(configUri), loadDb(dbUri)];
  promises.push(loadCampaignBots());
  promises.push(loadDonorsChooseBot(process.env.DONORSCHOOSEBOT_ID));

  return Promise.all(promises).then(() => {
    const SlothBotController = rootRequire('api/controllers/SlothBotController');
    app.locals.controllers.slothBot = new SlothBotController();
    if (app.locals.controllers.slothBot) {
      logger.debug('loaded app.locals.controllers.slothBot');
    }

    return true;
  });
};
