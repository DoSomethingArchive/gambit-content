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
function getTemplateDataFromEntryAndTemplateName(entry, templateName) {
  const contentTypeName = contentful.parseContentTypeFromEntry(entry);
  return config.templatesByContentType[contentTypeName][templateName];
}

/**
 * @param {Object} entry
 * @param {String} templateName
 * @return {String}
 */
function getDefaultValueFromEntryAndTemplateName(entry, templateName) {
  const data = module.exports.getTemplateDataFromEntryAndTemplateName(entry, templateName);
  return data.default;
}

/**
 * @param {Object} entry
 * @param {String} templateName
 * @return {String}
 */
function getFieldValueFromEntryAndTemplateName(entry, templateName) {
  const data = module.exports.getTemplateDataFromEntryAndTemplateName(entry, templateName);
  return entry.fields[data.fieldName];
}

/**
 * @param {Object} entry
 * @param {String} templateName
 * @return {Object}
 */
function getTemplateFromEntryAndTemplateName(entry, templateName) {
  const fieldValue = module.exports.getFieldValueFromEntryAndTemplateName(entry, templateName);
  if (fieldValue) {
    return {
      raw: fieldValue,
      override: true,
    };
  }

  return {
    raw: module.exports.getDefaultValueFromEntryAndTemplateName(entry, templateName),
    override: false,
  };
}

/**
 * @param {Object} entry
 * @return {Object}
 */
function getTemplatesFromEntry(entry) {
  const result = {};
  const contentTypeName = contentful.parseContentTypeFromEntry(entry);
  const templateNames = Object.keys(config.templatesByContentType[contentTypeName]);
  templateNames.forEach((templateName) => {
    result[templateName] = module.exports.getTemplateFromEntryAndTemplateName(entry, templateName);
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
    postConfigTemplates = module.exports.getTemplatesFromEntry(postConfig);
  }
  const botConfigTemplates = module.exports.getTemplatesFromEntry(botConfig);
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
  getDefaultValueFromEntryAndTemplateName,
  getFieldValueFromEntryAndTemplateName,
  getTemplateDataFromEntryAndTemplateName,
  getTemplateFromEntryAndTemplateName,
  getTemplatesFromBotConfig,
  getTemplatesFromEntry,
  getPostTypeFromBotConfig,
};
