'use strict';

const logger = app.locals.logger;

/**
 * Returns object of Mongoose api models for given connection, indexed by collection name.
 */
module.exports.getModels = function (conn) {
  const models = {};

  models.bot_requests = rootRequire('app/models/BotRequest')(conn);
  models.broadcasts = rootRequire('app/models/Broadcast')(conn);
  models.campaigns = rootRequire('app/models/Campaign')(conn);
  models.campaignbots = rootRequire('app/models/CampaignBot')(conn);
  models.donorschoosebots = rootRequire('app/models/DonorsChooseBot')(conn);
  models.donorschoose_donations = rootRequire('app/models/DonorsChooseDonation')(conn);
  models.reportback_submissions = rootRequire('app/models/ReportbackSubmission')(conn);
  models.signups = rootRequire('app/models/Signup')(conn);
  models.users = rootRequire('app/models/User')(conn);

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
