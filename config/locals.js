'use strict';

/**
 * Imports.
 */
const gambitJunior = rootRequire('lib/gambit-junior');
const logger = app.locals.logger;

/**
 * Returns a bot model for given endpoint and data.
 */
function cacheBot(endpoint, gambitJuniorBot) {
  logger.debug(`locals.cacheBot endpoint:${endpoint} id:${gambitJuniorBot.id}`);

  const data = gambitJuniorBot;
  data._id = Number(gambitJuniorBot.id);
  data.id = undefined;

  return app.locals.db[endpoint]
    .findOneAndUpdate({ _id: data._id }, data, { upsert: true, new: true })
    .exec();
}

/**
 * Returns a campaign model for given Phoenix Campaign.
 */
function cacheCampaign(phoenixCampaign) {
  const data = {
    status: phoenixCampaign.status,
    tagline: phoenixCampaign.tagline,
    title: phoenixCampaign.title,
    msg_rb_confirmation: phoenixCampaign.reportbackInfo.confirmationMessage,
    rb_noun: phoenixCampaign.reportbackInfo.noun,
    rb_verb: phoenixCampaign.reportbackInfo.verb,
  };

  return app.locals.db.campaigns
    .findOneAndUpdate({ _id: phoenixCampaign.id }, data, { upsert: true, new: true })
    .exec();
}

/**
 * Find model for given bot type/id.
 */
function findBot(endpoint, id) {
  logger.debug(`locals.findBot endpoint:${endpoint} id:${id}`);

  return app.locals.db[endpoint]
    .findById(id)
    .exec();
}

/**
 * Gets given bot type/id from Gambit Jr API and returns cached model.
 */
function getBot(endpoint, id) {
  logger.debug(`locals.getBot endpoint:${endpoint} id:${id}`);

  return gambitJunior
    .get(endpoint, id)
    .then(bot => cacheBot(endpoint, bot))
    .catch((err) => {
      logger.error(err);

      return null;
    });
}

/**
 * Loads given campaignModel's keywords into app.locals.keywords hash map.
 */
function loadKeywordsForCampaign(campaignModel) {
  const campaignID = campaignModel._id;
  if (!campaignID) {
    logger.warn('loadKeywordsForCampaign campaignID undefined');

    return null;
  }

  if (!campaignModel.keywords.length) {
    logger.warn(`no keywords for campaign:${campaignID} `);

    return null;
  }

  return campaignModel.keywords.forEach((campaignKeyword) => {
    const keyword = campaignKeyword.toLowerCase();
    logger.debug(`loaded app.locals.keyword[${keyword}]:${campaignID}`);
    app.locals.keywords[keyword] = campaignID;

    return app.locals.keywords[keyword];
  });
}

/**
 * Returns object of Mongoose api models for given connection, indexed by collection name.
 */
module.exports.getModels = function (conn) {
  const models = {};
  // Indexed by collection name:
  models.campaigns = rootRequire('api/models/Campaign')(conn);
  models.campaignbots = rootRequire('api/models/CampaignBot')(conn);
  models.donorschoosebots = rootRequire('api/models/DonorsChooseBot')(conn);
  models.donorschoose_donations = rootRequire('api/models/DonorsChooseDonation')(conn);
  models.reportback_submissions = rootRequire('api/models/ReportbackSubmission')(conn);
  models.signups = rootRequire('api/models/Signup')(conn);
  models.users = rootRequire('api/models/User')(conn);
  // TBDeleted
  models.legacyReportbacks = rootRequire('api/legacy/reportback/reportbackModel')(conn);

  return models;
};

/**
 * Gets given bot from API, or loads from cache if error.
 */
module.exports.loadBot = function (endpoint, id) {
  logger.debug(`locals.loadBot endpoint:${endpoint} id:${id}`);

  return getBot(endpoint, id)
    .then((bot) => {
      if (!bot) {
        logger.debug('getBot undefined');

        return findBot(endpoint, id);
      }

      return bot;
    });
};

/**
 * Caches given phoenixCampaign and loads into app.locals.campaigns, adds to app.locals.keywords.
 */
module.exports.loadCampaign = function (phoenixCampaign) {
  const campaignID = phoenixCampaign.id;
  logger.debug(`loadCampaign:${campaignID}`);

  return cacheCampaign(phoenixCampaign)
    .then((campaignDoc) => {
      if (!campaignDoc) {
        return null;
      }

      app.locals.campaigns[campaignID] = campaignDoc;
      logger.debug(`loaded app.locals.campaigns[${campaignID}]`);

      return loadKeywordsForCampaign(campaignDoc);
    })
    .catch(err => logger.error(err));
};

/**
 * Legacy config models.
 */

/**
 * Returns object with a data property, containing a hash map of models for modelName by model id.
 */
function getLegacyModelMap(configName, model) {
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
 * Loads map of config content as app.locals.configs object instead using Mongoose find queries.
 */
module.exports.loadLegacyConfigs = function (conn) {
  /* eslint-disable max-len*/
  const models = {
    legacyReportbacks: rootRequire('api/legacy/reportback/reportbackConfigModel')(conn),
    legacyStartCampaignTransitions: rootRequire('api/legacy/ds-routing/config/startCampaignTransitionsConfigModel')(conn),
    legacyYesNoPaths: rootRequire('api/legacy/ds-routing/config/yesNoPathsConfigModel')(conn),
  };
  /* eslint-enable max-len*/

  const promises = [];
  Object.keys(models).forEach((modelName) => {
    const promise = getLegacyModelMap(modelName, models[modelName]);
    promises.push(promise);
  });

  return Promise.all(promises).then((modelMaps) => {
    modelMaps.forEach((modelMap) => {
      app.locals.configs[modelMap.name] = modelMap.data;
      logger.debug(`app.locals.configs loaded ${modelMap.count} ${modelMap.name}`);
    });
  });
};
