'use strict';

/**
 * Imports.
 */
const superagent = require('superagent');
const logger = require('winston');
const Cacheman = require('cacheman');
const RedisEngine = require('cacheman-redis');
const Promise = require('bluebird');
const campaignHelper = require('./helpers/campaign');

const config = require('../config/lib/phoenix');
const redisClient = require('../config/redis')();

let campaignsCache;

function getCampaignsCache() {
  if (!campaignsCache) {
    const redisEngine = new RedisEngine(redisClient);
    campaignsCache = new Cacheman('campaigns', {
      ttl: config.cache.ttl,
      engine: redisEngine,
    });
  }
  return campaignsCache;
}

/**
 * @param {string} endpoint
 * @param {object} query
 * @param {object} data
 */
function executeGet(endpoint, query = {}) {
  const baseUri = config.clientOptions.baseUri;
  const url = `${baseUri}/${endpoint}`;
  logger.debug('executeGet', { url });

  return superagent
    .get(url)
    .query(query)
    .then(res => res.body);
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
 * Returns given DS Campaign object is closed.
 * TODO: When Conversations goes live, this won't be needed.
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
module.exports.fetchCampaignById = function (campaignId) {
  logger.debug(`phoenix.fetchCampaignById:${campaignId}`);
  const endpoint = `campaigns/${campaignId}`;

  return new Promise((resolve, reject) => {
    executeGet(endpoint)
      .then(res => getCampaignsCache()
        .set(`${campaignId}`, campaignHelper.parseCampaign(res.data, config.useAshes())))
      .then(campaign => resolve(JSON.parse(campaign)))
      .catch(err => reject(exports.parsePhoenixError(err, campaignId)));
  });
};

/**
 * getCampaignById - Attemps to get the cached campaign by id, if its not
 *                   cached, it fetches it from Phoenix.
 *
 * @param  {Number} campaignId
 * @return {Promise}
 */
module.exports.getCampaignById = function getCampaignById(campaignId) {
  logger.debug(`phoenix.getCampaignById:${campaignId}`);

  return getCampaignsCache().get(`${campaignId}`)
    .then((campaign) => {
      if (campaign) {
        logger.debug(`Campaigns cache hit:${campaignId}`);
        return Promise.resolve(campaign);
      }
      logger.debug(`Campaigns cache miss:${campaignId}`);
      return exports.fetchCampaignById(campaignId);
    })
    .catch(err => Promise.reject(err));
};

/**
 * @param {Array} campaignIds
 * @return {Promise}
 */
module.exports.fetchCampaigns = function (campaignIds) {
  const promises = [];
  campaignIds.forEach((campaignId) => {
    promises.push(module.exports.getCampaignById(campaignId));
  });
  return Promise.all(promises);
};
