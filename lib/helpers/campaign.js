'use strict';

const dateFns = require('date-fns');
const logger = require('winston');
const Promise = require('bluebird');
const helpers = require('../helpers');
const contentful = require('../contentful');
const gateway = require('../gateway');
const config = require('../../config/lib/helpers/campaign');

/**
 * @param {Number} campaignId
 * @return {Promise}
 */
function fetchById(campaignId) {
  return gateway.fetchCampaignById(campaignId)
    .then(res => module.exports.parseCampaign(res.data))
    .then(campaign => helpers.cache.campaigns.set(campaignId, campaign));
}

/**
 * @param {Number} campaignId
 * @return {Promise}
 */
function fetchCampaignConfigByCampaignId(campaignId) {
  const query = {
    content_type: 'campaign',
    'fields.campaignId': campaignId,
  };
  return contentful.fetchEntries(query)
    .then(res => module.exports.parseCampaignConfig(res.data[0]))
    .then(campaignConfig => helpers.cache.campaignConfigs.set(campaignId, campaignConfig));
}

/**
 * @param {Number} campaignId
 * @param {Boolean} resetCache
 * @return {Promise}
 */
async function getById(campaignId, resetCache = false) {
  if (resetCache === true) {
    logger.debug('Campaign cache reset', { campaignId });
    return module.exports.fetchById(campaignId);
  }

  const data = await helpers.cache.campaigns.get(campaignId);
  if (data) {
    logger.debug('Campaign cache hit', { campaignId });
    return data;
  }

  logger.debug('Campaign cache miss', { campaignId });
  return module.exports.fetchById(campaignId);
}

/**
 * @param {Number} campaignId
 * @param {Boolean} resetCache
 * @return {Promise}
 */
async function getCampaignConfigByCampaignId(campaignId, resetCache = false) {
  if (resetCache === true) {
    logger.debug('Campaign config cache reset', { campaignId });
    return module.exports.fetchCampaignConfigByCampaignId(campaignId);
  }

  const data = await helpers.cache.campaignConfigs.get(campaignId);
  if (data) {
    logger.debug('Campaign config cache hit', { campaignId });
    return data;
  }

  logger.debug('Campaign config cache miss', { campaignId });
  return module.exports.fetchCampaignConfigByCampaignId(campaignId);
}

/**
 * @param {Object} contentfulEntry
 * @return {Promise}
 */
async function parseCampaignConfig(contentfulEntry) {
  if (!contentfulEntry) {
    return {};
  }

  const data = {
    id: contentful.getContentfulIdFromContentfulEntry(contentfulEntry),
    templates: {
      webSignup: {},
    },
  };

  const webSignupEntry = contentfulEntry.fields.webSignup;
  if (!webSignupEntry) {
    return data;
  }

  data.templates.webSignup = await helpers.contentfulEntry
    .getMessageTemplate(webSignupEntry, 'webSignup');

  return data;
}

module.exports = {
  fetchById,
  fetchCampaignConfigByCampaignId,
  getById,
  getByIds: function fetchByIds(campaignIds) {
    const promises = [];
    campaignIds.forEach(campaignId => promises.push(this.getById(campaignId)));
    return Promise.all(promises);
  },
  getCampaignConfigByCampaignId,
  /**
   * @param {Object} campaign
   * @return {String}
   */
  parseCampaignStatus: function parseCampaignStatus(campaign) {
    const endDate = campaign.end_date;
    if (endDate && endDate.date && dateFns.isPast(dateFns.parse(endDate.date))) {
      return config.statuses.closed;
    }
    return config.statuses.active;
  },
  /**
   * @param {Object} campaign
   * @return {Object}
   */
  parseCampaign: function parseCampaign(campaign) {
    return {
      id: campaign.id,
      title: campaign.internal_title,
      status: this.parseCampaignStatus(campaign),
      endDate: campaign.end_date ? campaign.end_date.date : null,
    };
  },
  parseCampaignConfig,
};
