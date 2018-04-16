'use strict';

const logger = require('winston');

const rogueClientConfig = require('../config/lib/rogue/rogue-client');
const clientCredentialsStrategy = require('./rogue/strategies/client-credentials').getInstance({
  tokenConfig: {
    scope: rogueClientConfig.authStrategies.clientCredentials.scopes,
  },
});
const apiKeyStrategy = require('./rogue/strategies/api-key').getInstance();
/**
 * We want to support both strategies as we roll out changes to use the new Rogue V3 endpoints
 */
const rogueClient = require('./rogue/rogue-client').getInstance({}, [
  clientCredentialsStrategy,
  apiKeyStrategy,
]);
/**
 * getRogueUrl
 *
 * @param  {string} path
 * @param  {string} version = 'v2' description
 * @return {string}
 */
function getRogueUrl(path, version = 'v2') {
  const url = `${rogueClientConfig[version].baseUri}/${path}`;
  logger.debug(`getRogueUrl: ${url}`);
  return url;
}
/**
 * executeGet
 *
 * @param {string} endpoint
 * @param {Object} query
 * @param {string} version = 'v2' - Rogue API version
 * @param {string} strategyName = 'apiKeyCredentials'
 *                                Auth strategy used to send requests to Rogue's API
 */
function executeGet(endpoint, query = {}, version = 'v2', strategyName = 'apiKeyCredentials') {
  return rogueClient
    .request(strategyName)
    .get(getRogueUrl(endpoint, version))
    .query(query)
    .then(res => res.body);
}
/**
 * executePost
 *
 * @param {string} endpoint
 * @param {Object} data - payload to be sent in the POST request to Rogue
 * @param {string} version = 'v2' - Rogue API version
 * @param {string} strategyName = 'apiKeyCredentials'
 *                                Auth strategy used to send requests to Rogue's API
 */
function executePost(endpoint, data, version = 'v2', strategyName = 'apiKeyCredentials') {
  return rogueClient
    .request(strategyName)
    .post(getRogueUrl(endpoint, version))
    .send(data)
    .then(res => res.body);
}
/**
 * createPost
 *
 * @param {object} data
 * @return {Promise}
 */
module.exports.createPost = function (data) {
  return executePost('posts', data);
};
/**
 * createSignup
 *
 * @param {object} data
 * @return {Promise}
 */
module.exports.createSignup = function (data) {
  return executePost('signups', data);
};
/**
 * fetchActivityForUserIdAndCampaignRunId
 *
 * @param {string} userId
 * @param {number} campaignRunId
 * @return {Promise}
 */
module.exports.fetchActivityForUserIdAndCampaignRunId = function (userId, campaignRunId) {
  logger.debug(`rogue.fetchActivity userId=${userId} campaignRunId=${campaignRunId}`);
  const query = `filter[northstar_id]=${userId}&filter[campaign_run_id]=${campaignRunId}`;

  // TODO: remove when we fully switch to Rogue V3
  if (rogueClientConfig.useV3()) {
    return executeGet('signups', query, 'v3', 'clientCredentials');
  }

  return executeGet('activity', query);
};
