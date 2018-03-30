'use strict';

const contentful = require('../contentful');

module.exports = {
  fetchByCampaignId: function fetchByCampaignId(campaignId) {
    return contentful.fetchBotConfigByCampaignId(campaignId);
  },
};
