'use strict';

/**
 * Imports.
 */
const PhoenixClient = require('@dosomething/phoenix-js');
const logger = require('winston');

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

module.exports.client = client;

/**
 * Returns given DS Campaign object is closed.
 *
 * @param {Object} phoenixCampaign
 * @return {boolean}
 */
module.exports.isClosedCampaign = function (phoenixCampaign) {
  return (phoenixCampaign.status === 'closed');
};

/**
 * Fetches a DS Campaign for the given campaignId.
 *
 * @param {number} campaignId
 * @return {Promise}
 */
module.exports.fetchCampaign = function (campaignId) {
  logger.debug(`phoenix.fetchCampaign:${campaignId}`);

  return new Promise((resolve, reject) => {
    client.Campaigns.get(campaignId)
      .then(phoenixCampaign => resolve(phoenixCampaign))
      .catch((err) => {
        const scope = err;
        scope.message = `phoenix.fetchCampaign ${err.message}`;

        return reject(scope);
      });
  });
};
