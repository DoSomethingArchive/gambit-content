'use strict';

const dateFns = require('date-fns');
const logger = require('winston');
const config = require('../../config/lib/helpers/campaign');

module.exports = {
  /**
   * @param {Object} campaign
   * @return {Boolean}
   */
  isEndDatePast: function isEndDatePast(campaign) {
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

    return this.isEndDatePast(campaign);
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
   * @param {Boolean} useAshes
   * @return {Object}
   */
  parseCampaign: function parseCampaign(campaign, useAshes) {
    if (useAshes) {
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
  },
};
