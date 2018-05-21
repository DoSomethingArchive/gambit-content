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
 * @param {Object} entry
 * @param {String} templateName
 * @return {Object}
 */
function getTemplateDataFromContentfulEntryAndTemplateName(entry, templateName) {
  const contentTypeName = contentful.getContentTypeFromContentfulEntry(entry);
  return config.templatesByContentType[contentTypeName][templateName];
}

/**
 * @param {Object} entry
 * @param {String} templateName
 * @return {String}
 */
function getDefaultValueFromContentfulEntryAndTemplateName(entry, templateName) {
  const templateData = module.exports
    .getTemplateDataFromContentfulEntryAndTemplateName(entry, templateName);
  return templateData.default;
}

/**
 * @param {Object} entry
 * @param {String} templateName
 * @return {String}
 */
function getFieldValueFromContentfulEntryAndTemplateName(entry, templateName) {
  const templateData = module.exports
    .getTemplateDataFromContentfulEntryAndTemplateName(entry, templateName);
  return entry.fields[templateData.fieldName];
}

/**
 * @param {Object} entry
 * @param {String} templateName
 * @return {Object}
 */
function getTemplateFromContentfulEntryAndTemplateName(entry, templateName) {
  const fieldValue = module.exports
    .getFieldValueFromContentfulEntryAndTemplateName(entry, templateName);
  if (fieldValue) {
    return {
      raw: fieldValue,
      override: true,
    };
  }

  return {
    raw: module.exports.getDefaultValueFromContentfulEntryAndTemplateName(entry, templateName),
    override: false,
  };
}

/**
 * @param {Object} entry
 * @return {Object}
 */
function getTemplatesFromContentfulEntry(entry) {
  const result = {};
  const contentTypeName = contentful.getContentTypeFromContentfulEntry(entry);
  const templateNames = Object.keys(config.templatesByContentType[contentTypeName]);
  templateNames.forEach((templateName) => {
    result[templateName] = module.exports
      .getTemplateFromContentfulEntryAndTemplateName(entry, templateName);
  });
  return result;
}

/**
 * Returns a templates object for given botConfig, including its postConfig templates.
 * @param {Object} botConfig
 * @return {Object}
 */
function getTemplatesFromBotConfig(botConfig) {
  let postConfigTemplates = {};
  const postConfig = contentful.getPostConfigFromBotConfig(botConfig);
  if (postConfig) {
    postConfigTemplates = module.exports.getTemplatesFromContentfulEntry(postConfig);
  }
  const botConfigTemplates = module.exports.getTemplatesFromContentfulEntry(botConfig);
  return Object.assign(postConfigTemplates, botConfigTemplates);
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
  getDefaultValueFromContentfulEntryAndTemplateName,
  getFieldValueFromContentfulEntryAndTemplateName,
  getTemplateDataFromContentfulEntryAndTemplateName,
  getTemplateFromContentfulEntryAndTemplateName,
  getTemplatesFromBotConfig,
  getTemplatesFromContentfulEntry,
  getPostTypeFromBotConfig,
};
