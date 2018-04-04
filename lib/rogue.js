'use strict';

/**
 * Imports.
 */
const logger = require('winston');
const superagent = require('superagent');

const helpers = require('./helpers');
const defaultConfig = require('../config/lib/rogue');

const baseUri = defaultConfig.clientOptions.baseUri;
const apiHeader = defaultConfig.apiKeyHeader;
const apiKey = defaultConfig.clientOptions.apiKey;

/**
 * @param {string} endpoint
 * @param {object} query
 * @param {object} data
 */
function executeGet(endpoint, query = {}) {
  const url = `${baseUri}/${endpoint}`;

  return superagent
    .get(url)
    .query(query)
    .set(apiHeader, apiKey)
    .then(res => res.body);
}

/**
 * @param {string} endpoint
 * @param {object} data
 */
function executePost(endpoint, data) {
  const url = `${baseUri}/${endpoint}`;

  return superagent
    .post(url)
    .set(apiHeader, apiKey)
    .send(data)
    .then(res => res.body);
}

/**
 * @param {object} data
 * @return {Promise}
 */
module.exports.createSignup = function (data) {
  return executePost('signups', data);
};

/**
 * @param {string} url
 * @return {Buffer}
 */
function fetchDataForImageUrl(url) {
  logger.debug(`rogue.getDataForImageUrl:${url}`);

  // @see https://github.com/visionmedia/superagent/issues/871#issuecomment-286199206
  return superagent.get(url)
    .buffer(true)
    .parse(superagent.parse.image);
}

/**
 * @param {object} req
 * @return {Promise}
 */
module.exports.createPostForReq = function (req) {
  const data = helpers.signup.getCreatePhotoPostPayloadFromReq(req);
  logger.debug('rogue.createPostForReq', { data });

  return fetchDataForImageUrl(data.photo)
    .then((res) => {
      data.file = res.body.toString('base64');
      return executePost('posts', data);
    });
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
