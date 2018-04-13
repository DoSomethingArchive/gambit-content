'use strict';

const logger = require('winston');

const rogueClientConfig = require('../config/lib/rogue/rogue-client');

const clientCredentialsStrategy = require('./rogue/strategies/client-credentials').getInstance({
  tokenConfig: {
    scope: rogueClientConfig.authStrategies.clientCredentials.scopes,
  },
});
const apiKeyStrategy = require('./rogue/strategies/api-key').getInstance();
const rogueClient = require('./rogue/rogue-client').getInstance([
  clientCredentialsStrategy,
  apiKeyStrategy,
]);

function rogueUrl(path, version = 'v2') {
  const url = `${rogueClientConfig[version].baseUri}/${path}`;
  logger.debug(`rogueUrl: ${url}`);
  return url;
}

/**
 * @param {string} endpoint
 * @param {object} query
 * @param {object} data
 */
function executeGet(endpoint, query = {}, version = 'v2', strategyName = 'apiKeyCredentials') {
  return rogueClient
    .request(strategyName)
    .get(rogueUrl(endpoint, version))
    .query(query)
    .then(res => res.body);
}

/**
 * @param {string} endpoint
 * @param {object} data
 */
function executePost(endpoint, data, version = 'v2', strategyName = 'apiKeyCredentials') {
  return rogueClient
    .request(strategyName)
    .post(rogueUrl(endpoint, version))
    .send(data)
    .then(res => res.body);
}

/**
 * @param {object} data
 * @return {Promise}
 */
module.exports.createPost = function (data) {
  return executePost('posts', data);
};

/**
 * @param {object} data
 * @return {Promise}
 */
module.exports.createSignup = function (data) {
  return executePost('signups', data);
};

/**
 * @param {string} userId
 * @param {number} campaignRunId
 * return {Promise}
 */
module.exports.fetchActivityForUserIdAndCampaignRunId = function (userId, campaignRunId) {
  logger.debug(`rogue.fetchActivity userId=${userId} campaignRunId=${campaignRunId}`);
  const query = `filter[northstar_id]=${userId}&filter[campaign_run_id]=${campaignRunId}`;

  if (rogueClientConfig.useV3()) {
    return executeGet('signups', query, 'v3', 'clientCredentials');
  }

  return executeGet('activity', query);
};
