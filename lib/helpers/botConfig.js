'use strict';

const contentful = require('../contentful');
const config = require('../../config/lib/helpers/botConfig');

module.exports = {
  fetchByCampaignId: function fetchByCampaignId(campaignId) {
    return contentful.fetchBotConfigByCampaignId(campaignId);
  },
  parsePostTypeFromBotConfig: function parsePostTypeFromBotConfig(botConfig) {
    const postTemplate = contentful.getPostTemplateFromBotConfig(botConfig);
    if (!postTemplate) {
      return config.default.postType;
    }
    const postTemplateType = contentful.parseContentTypeFromEntry(postTemplate);
    return config.postTemplatePostTypes[postTemplateType];
  },
  getTemplateNames: function getTemplateNames() {
    return Object.keys(config.templates);
  },
  formatTemplate: function formatTemplate(text, isOverride) {
    return {
      raw: text,
      // TODO: Render Mustache tags.
      rendered: text,
      override: isOverride,
    };
  },
  getTemplateFromBotConfig: function getTemplateFromBotConfig(botConfig, templateName) {
    const templateConfig = config.templates[templateName];
    const fieldName = config.templates[templateName].fieldName;
    const fieldValue = botConfig.fields[fieldName];
    if (fieldValue) {
      return {
        raw: fieldValue,
        override: true,
      };
    }
    return {
      raw: templateConfig.default,
      override: false,
    };
  },
};
