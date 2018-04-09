'use strict';

const contentful = require('../contentful');
const config = require('../../config/lib/helpers/botConfig');

/**
 * Query Contentful to get the botConfig entry for given campaignId.
 * TODO: Add a botConfig cache helper to cache Contentful requests.
 *
 * @param {Number} campaignId
 * @return {Promise}
 */
function fetchByCampaignId(campaignId) {
  return contentful.fetchBotConfigByCampaignId(campaignId);
}

/**
 * @param {String} templateName
 * @return {String}
 */
function getDefaultTextForBotConfigTemplateName(templateName) {
  return config.templates.botConfig[templateName].default;
}

/**
 * @param {Object} botConfig
 * @param {String} templateName
 * @return {Object}
 */
function getTemplateFromBotConfigAndTemplateName(botConfig, templateName) {
  const botConfigValue = this.getTemplateTextFromBotConfigAndTemplateName(botConfig, templateName);
  if (botConfig && botConfigValue) {
    return {
      raw: botConfigValue,
      override: true,
    };
  }
  return {
    raw: this.getDefaultTextForBotConfigTemplateName(templateName),
    override: false,
  };
}

/**
 * @return {Array}
 */
function getTemplatesFromBotConfig(botConfig) {
  const result = {};
  const botConfigTemplates = Object.keys(config.templates.botConfig);

  botConfigTemplates.forEach((templateName) => {
    result[templateName] = this.getTemplateFromBotConfigAndTemplateName(botConfig, templateName);
  });
  return result;
}

/**
 * @param {Object} botConfig
 * @param {String} templateName
 * @return {String}
 */
function getTemplateTextFromBotConfigAndTemplateName(botConfig, templateName) {
  if (!botConfig) {
    return null;
  }
  const fieldName = config.templates.botConfig[templateName].fieldName;
  return botConfig.fields[fieldName];
}

/**
 * @param {Object} botConfig
 * @return {String}
 */
function getPostTypeFromBotConfig(botConfig) {
  const postConfigContentType = contentful.parsePostConfigContentTypeFromBotConfig(botConfig);
  if (!postConfigContentType) {
    return config.defaultPostType;
  }
  return config.postTypesByContentType[postConfigContentType];
}

module.exports = {
  fetchByCampaignId,
  getDefaultTextForBotConfigTemplateName,
  getTemplateFromBotConfigAndTemplateName,
  getTemplateTextFromBotConfigAndTemplateName,
  getTemplatesFromBotConfig,
  getPostTypeFromBotConfig,
};
