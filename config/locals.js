'use strict';

const logger = app.locals.logger;

/**
 * Returns a campaign model for given Phoenix Campaign.
 */
function cacheCampaign(phoenixCampaign) {
  const data = {
    status: phoenixCampaign.status,
    tagline: phoenixCampaign.tagline,
    title: phoenixCampaign.title,
    current_run: phoenixCampaign.currentCampaignRun.id,
    msg_rb_confirmation: phoenixCampaign.reportbackInfo.confirmationMessage,
    rb_noun: phoenixCampaign.reportbackInfo.noun,
    rb_verb: phoenixCampaign.reportbackInfo.verb,
  };

  return app.locals.db.campaigns
    .findOneAndUpdate({ _id: phoenixCampaign.id }, data, { upsert: true, new: true })
    .exec();
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
  models.legacyReportbacks = rootRequire('legacy/reportback/reportbackModel')(conn);

  return models;
};

/**
 * Gets given bot from API, or loads from cache if error.
 */
module.exports.loadBot = function (botType, id) {
  const endpoint = `${botType}s`;
  logger.debug(`locals.loadBot endpoint:${endpoint} id:${id}`);
  const model = app.locals.db[endpoint];

  return model.lookupByID(id)
    .then((bot) => bot)
    .catch((err) => {
      logger.error(`${endpoint}.lookupByID:${id} failed`);

      return app.locals.db[endpoint]
        .findById(id)
        .exec();
    });
};

/**
 * Caches given phoenixCampaign and loads into app.locals.campaigns, adds to app.locals.keywords.
 */
module.exports.loadCampaign = function (phoenixCampaign) {
  const campaignID = phoenixCampaign.id;
  logger.debug(`loadCampaign:${campaignID}`);

  let campaign;

  return cacheCampaign(phoenixCampaign)
    .then((campaignDoc) => {
      if (!campaignDoc) {
        return null;
      }
      campaign = campaignDoc;

      // Commenting this out for now to unblock prod deploy.
      // campaign.createMobileCommonsGroups();

      app.locals.campaigns[campaignID] = campaign;
      logger.debug(`loaded app.locals.campaigns[${campaignID}]`);

      return loadKeywordsForCampaign(campaign);
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
    legacyReportbacks: rootRequire('legacy/reportback/reportbackConfigModel')(conn),
    legacyStartCampaignTransitions: rootRequire('legacy/ds-routing/config/startCampaignTransitionsConfigModel')(conn),
    legacyYesNoPaths: rootRequire('legacy/ds-routing/config/yesNoPathsConfigModel')(conn),
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
