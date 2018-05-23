'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');
const config = require('../../config/lib/helpers/topic');

/**
 * @param {String} topicId
 * @return {Promise}
 */
function getById(topicId) {
  return helpers.cache.topics.get(topicId)
    .then((data) => {
      if (data) {
        logger.debug('Topic cache hit', { topicId });
        return Promise.resolve(data);
      }
      logger.debug('Topic cache miss', { topicId });
      return contentful.fetchByContentfulId(topicId)
        .then(contentfulEntry => module.exports.parseTopicFromContentfulEntry(contentfulEntry));
    });
}

/**
 * @return {Promise}
 */
function fetchDefaultTopicTriggers() {
  return contentful.fetchDefaultTopicTriggers()
    .then(contentfulEntries => contentfulEntries.map(module.exports
      .parseDefaultTopicTriggerFromContentfulEntry));
}

/**
 * @param {String} topicId
 * @return {Promise}
 */
function fetchDefaultTopicTriggersByTopicId(topicId) {
  return contentful.fetchByResponseReferenceContentfulId(topicId)
    .then(contentfulEntries => contentfulEntries.map(module.exports
      .parseDefaultTopicTriggerFromContentfulEntry));
}

/**
 * @param {String} campaignId
 * @return {Promise}
 */
function fetchTopicsByCampaignId(campaignId) {
  return contentful.fetchCampaignConfigByCampaignId(campaignId)
    .then((campaignConfig) => {
      const contentfulId = contentful.getContentfulIdFromContentfulEntry(campaignConfig);
      // TODO: Loop through all topicContentTypes.
      const contentType = config.topicContentTypes[0];
      return contentful
        .fetchByContentTypeAndCampaignReferenceContentfulId(contentType, contentfulId);
    })
    .then(contentfulEntries => Promise.all(contentfulEntries.map(module.exports
      .parseTopicFromContentfulEntry)))
    .catch(err => Promise.reject(err));
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
 * @param {String} contentType
 * @return {String}
 */
function getPostTypeFromContentType(contentType) {
  return config.postTypesByContentType[contentType];
}

/**
 * Parses a defaultTopicTrigger Contentful entry as data for writing Rivescript to define
 * triggers on the default topic.
 *
 * @param {Object} contentfulEntry - defaultTopicTrigger
 * @return {String}
 */
function parseDefaultTopicTriggerFromContentfulEntry(contentfulEntry) {
  const data = {
    trigger: contentful.getTriggerTextFromDefaultTopicTrigger(contentfulEntry),
  };

  const responseEntry = contentful.getResponseEntryFromDefaultTopicTrigger(contentfulEntry);
  if (!responseEntry) {
    return null;
  }

  if (contentful.isDefaultTopicTrigger(responseEntry)) {
    data.redirect = contentful.getTriggerTextFromDefaultTopicTrigger(responseEntry);
    return data;
  }

  if (contentful.isMessage(responseEntry)) {
    data.reply = contentful.getTextFromMessage(responseEntry);
    return data;
  }

  data.topicId = contentful.getContentfulIdFromContentfulEntry(responseEntry);
  return data;
}

/**
 * @param {Object} contentfulEntry
 * @return {Promise}
 */
function parseTopicFromContentfulEntry(contentfulEntry) {
  const topicId = contentful.getContentfulIdFromContentfulEntry(contentfulEntry);
  logger.debug('parseTopicFromContentfulEntry', { topicId });
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);
  const data = {
    id: topicId,
    type: contentType,
    postType: module.exports.getPostTypeFromContentType(contentType),
  };
  const campaignConfig = contentfulEntry.fields.campaign;
  data.campaignId = contentful.getCampaignIdFromContentfulEntry(campaignConfig);
  const topicTemplates = module.exports.getTemplatesFromContentfulEntry(contentfulEntry);
  const campaignTemplates = module.exports.getTemplatesFromContentfulEntry(campaignConfig);
  data.templates = Object.assign(topicTemplates, campaignTemplates);
  logger.debug('parseTopicFromContentfulEntry', { data });

  return module.exports.fetchDefaultTopicTriggersByTopicId(topicId)
    .then((triggerObjects) => {
      // Save linked defaultTopicTriggers as list of the triggers.
      data.defaultTopicTriggers = triggerObjects.map(triggerObject => triggerObject.trigger);
      return helpers.cache.topics.set(topicId, data);
    })
    .then(() => Promise.resolve(data))
    .catch(err => Promise.reject(err));
}
module.exports = {
  fetchDefaultTopicTriggers,
  fetchDefaultTopicTriggersByTopicId,
  fetchTopicsByCampaignId,
  getById,
  getDefaultValueFromContentfulEntryAndTemplateName,
  getFieldValueFromContentfulEntryAndTemplateName,
  getTemplateDataFromContentfulEntryAndTemplateName,
  getTemplateFromContentfulEntryAndTemplateName,
  getTemplatesFromContentfulEntry,
  getPostTypeFromContentType,
  parseDefaultTopicTriggerFromContentfulEntry,
  parseTopicFromContentfulEntry,
};
