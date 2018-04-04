'use strict';

const logger = require('winston');
const superagent = require('superagent');
const defaultConfig = require('../config/lib/rogue');

const apiHeader = defaultConfig.apiKeyHeader;
const apiKey = defaultConfig.clientOptions.apiKey;

function rogueUrl(path) {
  return `${defaultConfig.clientOptions.baseUri}/${path}`;
}

/**
 * @param {string} endpoint
 * @param {object} query
 * @param {object} data
 */
function executeGet(endpoint, query = {}) {
  return superagent
    .get(rogueUrl(endpoint))
    .query(query)
    .set(apiHeader, apiKey)
    .then(res => res.body);
}

/**
 * @param {string} endpoint
 * @param {object} data
 */
function executePost(endpoint, data) {
  return superagent
    .post(rogueUrl(endpoint))
    .set(apiHeader, apiKey)
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

  return executeGet('activity', query);
};
