'use strict';

const logger = require('winston');
const { RogueClient } = require('@dosomething/gateway/server');

let rogueClient;

function getClient() {
  if (!rogueClient) {
    rogueClient = RogueClient.getNewInstance();
  }
  return rogueClient;
}
/**
 * createPost
 *
 * @param {object} data
 * @return {Promise}
 */
function createPost(data) {
  return getClient().Posts.create(data);
}
/**
 * createSignup
 *
 * @param {object} data
 * @return {Promise}
 */
function createSignup(data) {
  return getClient().Signups.create(data);
}
/**
 * getSignupsByUserIdAndCampaignRunId
 *
 * @param {string} userId
 * @param {number} campaignRunId
 * @return {Promise}
 */
function getSignupsByUserIdAndCampaignRunId(userId, campaignRunId) {
  logger.debug(`rogue.fetchActivity userId=${userId} campaignRunId=${campaignRunId}`);
  return getClient().Signups.getSignupsByUserIdAndCampaignRunId(userId, campaignRunId);
}

function getConfig() {
  return getClient().config;
}

module.exports = {
  getConfig,
  getClient,
  createPost,
  createSignup,
  getSignupsByUserIdAndCampaignRunId,
};
