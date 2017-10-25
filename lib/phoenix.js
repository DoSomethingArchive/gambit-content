'use strict';

/**
 * Imports.
 */
const superagent = require('superagent');
const logger = require('winston');

const defaultConfig = require('../config/lib/phoenix');

/**
 * @param {string} endpoint
 * @param {object} query
 * @param {object} data
 */
function executeGet(endpoint, query = {}) {
  const baseUri = defaultConfig.clientOptions.baseUri;
  const url = `${baseUri}/${endpoint}`;

  return superagent
    .get(url)
    .query(query)
    .then(res => res.body);
}

/**
 * @param {object} data
 * @return {object}
 */
module.exports.parsePhoenixCampaign = function (data) {
  const result = {};
  result.id = Number(data.id);
  result.title = data.title;
  result.tagline = data.tagline;
  result.status = data.status;
  result.currentCampaignRun = {
    id: Number(data.campaign_runs.current.en.id),
  };
  const rbInfo = data.reportback_info;
  result.reportbackInfo = {
    confirmationMessage: rbInfo.confirmation_message,
    noun: rbInfo.noun,
    verb: rbInfo.verb,
  };
  result.facts = {
    problem: data.facts.problem,
  };

  return result;
};

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
module.exports.fetchCampaign = function (campaignId) {
  logger.debug(`phoenix.fetchCampaign:${campaignId}`);
  const endpoint = `campaigns/${campaignId}`;

  return new Promise((resolve, reject) => {
    executeGet(endpoint)
      .then(res => resolve(exports.parsePhoenixCampaign(res.data)))
      .catch(err => reject(exports.parsePhoenixError(err, campaignId)));
  });
};

module.exports.fetchCampaigns = function (campaignIds) {
  logger.debug(`phoenix.fetchCampaigns:${campaignIds}`);
  const endpoint = `campaigns?ids=${campaignIds.join(',')}`;

  return new Promise((resolve, reject) => {
    executeGet(endpoint)
      .then(res => resolve(res.data.map(campaign => exports.parsePhoenixCampaign(campaign))))
      .catch(err => reject(exports.parsePhoenixError(err)));
  });
};
