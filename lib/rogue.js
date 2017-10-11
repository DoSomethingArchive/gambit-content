'use strict';

/**
 * Imports.
 */
const logger = require('winston');
const superagent = require('superagent');
const ip = require('ip');

const defaultConfig = require('../config/lib/rogue');

/**
 * @param {string} endpoint
 * @param {object} data
 */
function executePost(endpoint, data) {
  const url = `${defaultConfig.clientOptions.baseUri}/${endpoint}`;

  return superagent
    .post(url)
    .set(defaultConfig.apiKeyHeader, defaultConfig.clientOptions.apiKey)
    .send(data)
    .then(res => res.body);
}

/**
 * @param {object} req
 * @return {object}
 */
function getDefaultPayloadForReq(req) {
  const campaign = req.campaign;
  const userId = req.userId;
  // @see https://github.com/DoSomething/rogue/blob/master/documentation/endpoints/signups.md#signups
  const data = {
    source: defaultConfig.source,
    campaign_id: Number(campaign.id),
    campaign_run_id: Number(campaign.currentCampaignRun.id),
    northstar_id: userId,
  };
  return data;
}

/**
 * @param {object} req
 * @return {Promise}
 */
module.exports.createSignupForReq = function (req) {
  const data = getDefaultPayloadForReq(req);
  logger.debug('rogue.createSignupForReq', { data });

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
  const data = getDefaultPayloadForReq(req);
  const draft = req.signup.draft_reportback_submission;

  // @see https://github.com/DoSomething/rogue/blob/master/documentation/endpoints/posts.md
  data.quantity = draft.quantity;
  data.caption = draft.caption;
  data.remote_addr = ip.address();
  if (draft.why_participated) {
    data.why_participated = draft.why_participated;
  }
  logger.debug('rogue.createPostForReq', { data });

  return fetchDataForImageUrl(draft.photo)
    .then((res) => {
      data.file = res.body.toString('base64');
      return executePost('posts', data);
    });
};
