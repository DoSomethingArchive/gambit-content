'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const logger = rootRequire('lib/logger');
const gambitJunior = rootRequire('lib/gambit-junior');

/**
 * Find CampaignBot model for given CampaignBot id.
 */
function findCampaignBot(id) {
  logger.debug(`findCampaignBot:${id}`);

  return app.locals.db.campaignBots
    .findById(id)
    .exec();
}

/**
 * Gets given CampaignBot id from Gambit Jr API and returns cached CampaignBot model.
 */
function getCampaignBot(id) {
  logger.debug(`getCampaignBot:${id}`);

  return gambitJunior
    .get('campaignbots', id)
    .then((campaignBot) => {
      const data = campaignBot;
      data._id = campaignBot.id;
      data.id = undefined;

      return app.locals.db.campaignBots
        .findOneAndUpdate({ _id: id }, data, { upsert: true, new: true })
        .exec();
    })
    .catch((err) => {
      logger.error(err);

      return null;
    });
}

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
    msg_rb_confirmation: campaign.reportbackInfo.confirmationMessage,
    rb_noun: campaign.reportbackInfo.noun,
    rb_verb: campaign.reportbackInfo.verb,
  };

  return app.locals.db.campaigns
    .findOneAndUpdate({ _id: campaign.id }, data, { upsert: true, new: true })
    .exec()
    .then((campaignDoc) => {
      if (!campaignDoc) {
        return null;
      }

      app.locals.campaigns[campaign.id] = campaignDoc;
      logger.debug(`loaded app.locals.campaigns[${campaignDoc._id}]`);

      if (campaignDoc.keywords) {
        campaignDoc.keywords.forEach((campaignKeyword) => {
          const keyword = campaignKeyword.toLowerCase();
          app.locals.keywords[keyword] = campaign.id;
          logger.debug(`loaded app.locals.keyword[${keyword}]:${campaign.id}`);
        });
      } else {
        logger.warn(`keywords undefined for campaign:${campaign.id} `);
      }

      return campaignDoc;
    })
    .catch(err => logger.error(err));
}

/**
 * Loads app.locals.controllers.campaignBot from Gambit Jr API.
 */
module.exports.loadCampaignBotController = function () {
  logger.debug('loadCampaignBotController');
  const CAMPAIGNBOT_ID = process.env.CAMPAIGNBOT_ID || 41;

  return getCampaignBot(CAMPAIGNBOT_ID)
    .then((campaignBot) => {
      if (!campaignBot) {
        logger.debug('getCampaignBot undefined');

        return findCampaignBot(CAMPAIGNBOT_ID);
      }

      return campaignBot;
    })
    .then((campaignBot) => {
      const CampaignBotController = rootRequire('api/controllers/CampaignBotController');
      app.locals.controllers.campaignBot = new CampaignBotController(campaignBot);
      logger.info('loaded app.locals.controllers.campaignBot');

      return app.locals.controllers.campaignBot;
    })
    .catch((err) => {
      logger.error(err);
    });
};

/**
 * Loads app.locals.campaigns from DS API.
 */
module.exports.loadCampaigns = function () {
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
};

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
 * Loads app.locals.db object of Mongoose models.
 */
module.exports.loadDb = function (conn) {
  app.locals.db = {};
  app.locals.db.campaigns = rootRequire('api/models/Campaign')(conn);
  app.locals.db.campaignBots = rootRequire('api/models/CampaignBot')(conn);
  app.locals.db.donorsChooseDonations = rootRequire('api/models/DonorsChooseDonation')(conn);
  app.locals.db.legacyReportbacks = rootRequire('api/legacy/reportback/reportbackModel')(conn);
  app.locals.db.reportbackSubmissions = rootRequire('api/models/ReportbackSubmission')(conn);
  app.locals.db.signups = rootRequire('api/models/Signup')(conn);
  app.locals.db.users = rootRequire('api/models/User')(conn);

  return app.locals.db;
};

/**
 * Loads map of config content as app.locals.configs object instead using Mongoose find queries.
 * To be deprecated upon CampaignBot launch.
 */
function loadLegacyConfigs() {
  const uri = process.env.CONFIG_DB_URI || 'mongodb://localhost/config';
  const conn = mongoose.createConnection(uri);

  /* eslint-disable max-len*/
  const models = {
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

  app.locals.configs = {};

  return Promise.all(promises).then((modelMaps) => {
    modelMaps.forEach((modelMap) => {
      app.locals.configs[modelMap.name] = modelMap.data;
      logger.debug(`app.locals.configs loaded ${modelMap.count} ${modelMap.name}`);
    });
  });
}

/**
 * Returns authenticated Northstar JS client.
 */
module.exports.getNorthstarClient = function () {
  const NorthstarClient = require('@dosomething/northstar-js');

  return new NorthstarClient({
    baseURI: process.env.DS_NORTHSTAR_API_BASEURI,
    apiKey: process.env.DS_NORTHSTAR_API_KEY,
  });
};

/**
 * Returns authenticated Phoenix JS client.
 */
module.exports.getPhoenixClient = function () {
  const PhoenixClient = require('@dosomething/phoenix-js');

  return new PhoenixClient({
    baseURI: process.env.DS_PHOENIX_API_BASEURI,
    username: process.env.DS_PHOENIX_API_USERNAME,
    password: process.env.DS_PHOENIX_API_PASSWORD,
  });
};
 
/**
 * Loads required app.locals properties.
 */
module.exports.load = function () {
  const promises = [
    loadDonorsChooseBotController(),
    loadLegacyConfigs(),
  ];

  return Promise.all(promises);
};
