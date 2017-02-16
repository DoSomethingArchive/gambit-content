'use strict';

/**
 * Imports.
 */
const PhoenixClient = require('@dosomething/phoenix-js');
const NotFoundError = require('../app/exceptions/NotFoundError');
const logger = app.locals.logger;

/**
 * Setup.
 */
let client;
try {
  client = new PhoenixClient({
    baseURI: process.env.DS_PHOENIX_API_BASEURI,
    username: process.env.DS_PHOENIX_API_USERNAME,
    password: process.env.DS_PHOENIX_API_PASSWORD,
  });
} catch (err) {
  logger.error(`phoenix error:${err.message}`);
}

/**
 * Fetches Campaign object from DS API for given id.
 */
module.exports.fetchCampaign = function (campaignId) {
  return new Promise((resolve, reject) => {
    logger.debug(`phoenix.fetchCampaign:${campaignId}`);

    if (!campaignId) {
      const err = new NotFoundError('Campaign id undefined');
      return reject(err);
    }

    return client.Campaigns.get(campaignId)
      .then(campaign => resolve(campaign))
      .catch((err) => {
        const phoenixError = err;
        phoenixError.message = `Phoenix: ${err.message}`;

        return reject(phoenixError);
      });
  });
};
