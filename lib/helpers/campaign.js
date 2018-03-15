'use strict';

const logger = require('winston');
const config = require('../../config/lib/helpers/campaign');

/**
 * @param {Object} campaign
 * @return {String}
 */
function parseStatus(campaign) {
  const closedValue = config.statuses.closed;
  if (campaign.status) {
    return campaign.status;
  }

  if (!campaign.endDate) {
    return closedValue;
  }

  const endDate = new Date(campaign.endDate.date);
  if (Date.now() < endDate) {
    return closedValue;
  }

  return config.statuses.active;
}

/**
 * @param {object} data
 * @return {object}
 */
function parseCampaign(data) {
  const result = {
    id: Number(data.legacyCampaignId),
    title: data.title || null,
    tagline: data.tagline,
    status: parseStatus(data),
    currentCampaignRun: Number(data.legacyCampaignRunId),
  };
  logger.debug('parseCampaign', result);
  return result;
}

module.exports = {
  parseStatus,
  parseCampaign,
};

