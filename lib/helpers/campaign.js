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
    const closedValue = config.statuses.closed;
    if (campaign.status) {
      return campaign.status === closedValue;
    }
    if (!campaign.endDate) {
      return true;
    }
    return this.isEndDatePast(campaign);
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
   * @param {object} campaign
   * @return {Object}
   */
  parseCampaign: function parseCampaign(campaign) {
    const result = {
      id: Number(campaign.legacyCampaignId),
      title: campaign.title,
      tagline: campaign.tagline,
      status: this.parseStatus(campaign),
      currentCampaignRun: Number(campaign.legacyCampaignRunId),
      endDate: campaign.endDate,
    };
    logger.debug('parseCampaign', result);
    return result;
  },
};
