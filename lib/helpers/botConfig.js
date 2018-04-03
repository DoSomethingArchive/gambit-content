'use strict';

const contentful = require('../contentful');
const config = require('../../config/lib/helpers/botConfig');

module.exports = {
  /**
   * Query Contentful to get the botConfig entry for given campaignId.
   * TODO: Add a botConfig cache helper to cache Contentful requests.
   *
   * @param {Number} campaignId
   * @return {Promise}
   */
  fetchByCampaignId: function fetchByCampaignId(campaignId) {
    return contentful.fetchBotConfigByCampaignId(campaignId);
  },
  /**
   * @param {String} templateName
   * @return {String}
   */
  getDefaultTemplateText: function getDefaultTemplateText(templateName) {
    return config.templates[templateName].default;
  },
  /**
   * @param {Object} botConfig
   * @param {String} templateName
   * @return {String}
   */
  getTemplateTextFromBotConfig: function getTemplateTextFromBotConfig(botConfig, templateName) {
    const fieldName = config.templates[templateName].fieldName;
    return botConfig.fields[fieldName];
  },
  /**
   * @return {Array}
   */
  getTemplateNames: function getTemplateNames() {
    return Object.keys(config.templates);
  },
  /**
   * @param {Object} botConfig
   * @param {String} templateName
   * @return {Object}
   */
  getTemplateDataFromBotConfig: function getTemplateDataFromBotConfig(botConfig, templateName) {
    if (!botConfig) {
      return {
        raw: this.getDefaultTemplateText(templateName),
        override: false,
      };
    }
    return {
      raw: this.getTemplateTextFromBotConfig(botConfig, templateName),
      override: true,
    };
  },
  /**
   * @param {Object} botConfig
   * @return {String}
   */
  parsePostTypeFromBotConfig: function parsePostTypeFromBotConfig(botConfig) {
    const postTemplate = contentful.getPostTemplateFromBotConfig(botConfig);
    if (!postTemplate) {
      return config.defaultPostType;
    }
    const postTemplateType = contentful.parseContentTypeFromEntry(postTemplate);
    return config.postTemplatePostTypes[postTemplateType];
  },
};
