'use strict';

const dateFns = require('date-fns');
const logger = require('winston');
const Promise = require('bluebird');
const helpers = require('../helpers');
const contentful = require('../contentful');
const phoenix = require('../phoenix');
const config = require('../../config/lib/helpers/campaign');

/**
 * @param {Number} campaignId
 * @return {Promise}
 */
function fetchById(campaignId) {
  return phoenix.fetchCampaignById(campaignId)
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
    .getMessageTemplateFromContentfulEntryAndTemplateName(webSignupEntry, 'webSignup');

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
   * @return {Boolean}
   */
  hasEnded: function hasEnded(campaign) {
    const endDate = dateFns.parse(campaign.endDate.date);
    return dateFns.isPast(endDate);
  },
  /**
   * @param {Object} campaign
   * @return {Boolean}
   */
  isClosed: function isClosed(campaign) {
    if (campaign.status) {
      return this.isClosedStatus(campaign);
    }

    if (!campaign.endDate) {
      return false;
    }

    return this.hasEnded(campaign);
  },
  isClosedStatus: function isClosedStatus(campaign) {
    return campaign.status === config.statuses.closed;
  },
  /**
   * @param {Object} campaign
   * @return {String}
   */
  parseStatus: function parseStatus(campaign) {
    if (this.isClosed(campaign)) {
      return config.statuses.closed;
    }
    return config.statuses.active;
  },
  /**
   * @param {Object} campaign
   * @return {Object}
   */
  parseCampaign: function parseCampaign(campaign) {
    const campaignId = Number(campaign.legacyCampaignId);
    logger.debug('parseCampaign', { campaignId });

    const result = {
      id: campaignId,
      title: campaign.title,
      tagline: campaign.tagline,
      status: this.parseStatus(campaign),
      currentCampaignRun: { id: Number(campaign.legacyCampaignRunId) },
      endDate: campaign.endDate,
    };
    logger.debug('parseCampaign', { result });

    return result;
  },
  parseCampaignConfig,
};
