'use strict';

const logger = app.locals.logger;

/**
 * Returns object of Mongoose api models for given connection, indexed by collection name.
 */
module.exports.getModels = function (conn) {
  const models = {};
  // Indexed by collection name:
  models.campaigns = rootRequire('app/models/Campaign')(conn);
  models.campaignbots = rootRequire('app/models/CampaignBot')(conn);
  models.donorschoosebots = rootRequire('app/models/DonorsChooseBot')(conn);
  models.donorschoose_donations = rootRequire('app/models/DonorsChooseDonation')(conn);
  models.reportback_submissions = rootRequire('app/models/ReportbackSubmission')(conn);
  models.signups = rootRequire('app/models/Signup')(conn);
  models.users = rootRequire('app/models/User')(conn);
  // TBDeleted
  models.legacyReportbacks = rootRequire('legacy/reportback/reportbackModel')(conn);

  return models;
};

/**
 * Gets given bot from API, or loads from cache if error.
 */
module.exports.loadBot = function (type, id) {
  const endpoint = `${type}s`;
  logger.debug(`locals.loadBot endpoint:${endpoint} id:${id}`);
  const model = app.locals.db[endpoint];

  return model.lookupByID(id)
    .then((bot) => bot)
    .catch((err) => {
      logger.error(`${endpoint}.lookupByID:${id} failed`);
      logger.error(err);

      return app.locals.db[endpoint]
        .findById(id)
        .exec();
    });
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
  const models = {
    legacyReportbacks: rootRequire('legacy/reportback/reportbackConfigModel')(conn),
  };

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
