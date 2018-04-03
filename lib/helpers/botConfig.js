'use strict';

const contentful = require('../contentful');
const config = require('../../config/lib/helpers/botConfig');

module.exports = {
  fetchByCampaignId: function fetchByCampaignId(campaignId) {
    return contentful.fetchBotConfigByCampaignId(campaignId);
  },
  parsePostTypeFromBotConfig: function parsePostTypeFromBotConfig(botConfig) {
    const postTemplateEntry = contentful.getPostTemplateFromBotConfig(botConfig);
    if (!postTemplateEntry) {
      return config.default.postType;
    }
    const postTemplateType = contentful.parseTypeFromContentfulEntry(postTemplateEntry);
    return config.postTemplatePostTypes[postTemplateType];
  },
};
