'use strict';

/**
 * Imports.
 */
const superagent = require('superagent');
const logger = require('winston');
const Promise = require('bluebird');
const config = require('../config/lib/phoenix');

/**
 * @param {string} endpoint
 * @param {object} query
 * @param {object} data
 */
function executeGet(endpoint, query = {}) {
  const url = `${config.clientOptions.baseUri}/${endpoint}`;

  return new Promise((resolve, reject) => {
    logger.debug('executeGet', { url });
    return superagent
      .get(url)
      .query(query)
      .then(res => resolve(res.body))
      .catch(err => reject(module.exports.parsePhoenixError(err)));
  });
}

/**
 * @param {object} data
 * @return {object}
 */
module.exports.parsePhoenixError = function (err, campaignId) {
  const scope = err;
  scope.message = `phoenix campaignId=${campaignId} error=${err.message}`;
  return scope;
};

/**
 * Fetches a DS Campaign for the given campaignId.
 *
 * @param {number} campaignId
 * @return {Promise}
 */
module.exports.fetchCampaignById = function (campaignId) {
  logger.debug(`phoenix.fetchCampaignById:${campaignId}`);
  const endpoint = `campaigns/${campaignId}`;
  return executeGet(endpoint);
};
