'use strict';

const dateFns = require('date-fns');
const logger = require('winston');
const Promise = require('bluebird');
const cacheHelper = require('./cache');
const phoenix = require('../phoenix');
const config = require('../../config/lib/helpers/campaign');
const phoenixConfig = require('../../config/lib/phoenix');

/**
 * @param {String} campaignId
 * @return {Promise}
 */
function fetchById(campaignId) {
  return phoenix.fetchCampaignById(campaignId)
    .then(res => module.exports.parseCampaign(res.data));
}

module.exports = {
  fetchById,
  getByIds: function fetchByIds(campaignIds) {
    const promises = [];
    campaignIds.forEach(campaignId => promises.push(this.getById(campaignId)));
    return Promise.all(promises);
  },
  getById: function getById(campaignId) {
    return cacheHelper.campaigns.get(`${campaignId}`)
      .then((data) => {
        if (data) {
          logger.debug(`Campaigns cache hit:${campaignId}`);
          return data;
        }
        logger.debug(`Campaigns cache miss:${campaignId}`);
        return this.fetchById(campaignId)
          .then(campaign => cacheHelper.campaigns.set(`${campaignId}`, campaign));
      });
  },
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
    if (phoenixConfig.useAshes()) {
      return this.parseAshesCampaign(campaign);
    }
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
  /**
   * @param {object} data
   * @return {Object}
   */
  parseAshesCampaign: function parseAshesCampaign(data) {
    const result = {};
    const languageCode = data.language.language_code;
    result.id = Number(data.id);
    result.title = data.title;
    result.tagline = data.tagline;
    result.status = data.status;
    result.currentCampaignRun = {
      id: Number(data.campaign_runs.current[languageCode].id),
    };
    logger.debug('parseAshesCampaign', { result });

    return result;
  },
};
