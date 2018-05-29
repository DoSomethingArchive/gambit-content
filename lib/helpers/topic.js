'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');
const config = require('../../config/lib/helpers/topic');

/**
 * @return {Promise}
 */
function fetchAll() {
  // TODO: Loop through all pages of query results - currently returns 100.
  return contentful.fetchByContentTypes(config.topicContentTypes)
    .then(contentfulEntries => Promise.all(contentfulEntries.map(module.exports
      .parseTopicFromContentfulEntry)))
    .then(topics => helpers.cache.topics.set(config.allTopicsCacheKey, topics));
}

/**
 * @return {Promise}
 */
function getAll() {
  return helpers.cache.topics.get(config.allTopicsCacheKey)
    .then((topics) => {
      if (topics) {
        logger.debug('All topics cache hit', { count: topics.length });
        return topics;
      }
      logger.debug('All topics cache miss');
      return module.exports.fetchAll();
    });
}

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
 * @param {String} campaignId
 * @return {Promise}
 */
function getByCampaignId(campaignId) {
  return module.exports.getAll()
    .then(topics => Promise.resolve(topics.filter(topic => module.exports
      .isTopicForCampaignId(topic, campaignId))))
    .catch(err => Promise.reject(err));
}

function isTopicForCampaignId(topic, campaignId) {
  const result = topic.campaign && topic.campaign.id === Number(campaignId);
  logger.debug('isTopicForCampaignId', { topic, campaignId });
  return result;
}

/**
 * @param {Object} entry
 * @param {String} templateName
 * @return {Object}
 */
function getTemplateInfoFromContentfulEntryAndTemplateName(entry, templateName) {
  const contentTypeName = contentful.getContentTypeFromContentfulEntry(entry);
  return config.templatesByContentType[contentTypeName][templateName];
}

/**
 * @param {Object} entry
 * @param {String} templateName
 * @return {String}
 */
function getDefaultTextFromContentfulEntryAndTemplateName(entry, templateName) {
  const templateInfo = module.exports
    .getTemplateInfoFromContentfulEntryAndTemplateName(entry, templateName);
  return templateInfo.defaultText;
}

/**
 * @param {Object} entry
 * @param {String} templateName
 * @return {String}
 */
function getFieldValueFromContentfulEntryAndTemplateName(entry, templateName) {
  const templateInfo = module.exports
    .getTemplateInfoFromContentfulEntryAndTemplateName(entry, templateName);
  return entry.fields[templateInfo.fieldName];
}

/**
 * @param {Object} entry
 * @param {String} templateName
 * @return {Object}
 */
function parseTemplateFromContentfulEntryAndTemplateName(contentfulEntry, templateName) {
  const data = {};
  const templateText = module.exports
    .getFieldValueFromContentfulEntryAndTemplateName(contentfulEntry, templateName);
  if (templateText) {
    data.raw = templateText;
    data.override = true;
  } else {
    data.raw = module.exports
      .getDefaultTextFromContentfulEntryAndTemplateName(contentfulEntry, templateName);
    data.override = false;
  }
  return data;
}

/**
 * @param {Object} entry
 * @return {Object}
 */
function parseTemplatesFromContentfulEntryAndCampaign(entry, campaign) {
  const data = {};
  const contentType = contentful.getContentTypeFromContentfulEntry(entry);
  const templateNames = Object.keys(config.templatesByContentType[contentType]);
  templateNames.forEach((templateName) => {
    data[templateName] = module.exports
      .parseTemplateFromContentfulEntryAndTemplateName(entry, templateName);
    data[templateName].rendered = helpers
      .replacePhoenixCampaignVars(data[templateName].raw, campaign);
  });
  return data;
}

/**
 * @param {String} contentType
 * @return {String}
 */
function getPostTypeFromContentType(contentType) {
  return config.postTypesByContentType[contentType];
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

  const campaignConfigEntry = contentfulEntry.fields.campaign;
  const campaignId = contentful.getCampaignIdFromContentfulEntry(campaignConfigEntry);
  if (!campaignId) {
    data.campaign = null;
    return Promise.resolve(data);
  }

  return helpers.campaign.fetchById(campaignId)
    .then((campaign) => {
      data.campaign = campaign;
      const topicTemplates = module.exports
        .parseTemplatesFromContentfulEntryAndCampaign(contentfulEntry, campaign);
      const campaignConfigTemplates = module.exports
        .parseTemplatesFromContentfulEntryAndCampaign(campaignConfigEntry, campaign);
      data.templates = Object.assign(topicTemplates, campaignConfigTemplates);
      return helpers.defaultTopicTrigger.getByTopicId(topicId);
    })
    .then((defaultTopicTriggers) => {
      data.defaultTopicTriggers = defaultTopicTriggers.map(triggerObject => triggerObject.trigger);
      return Promise.resolve(helpers.cache.topics.set(topicId, data));
    })
    .catch(err => Promise.reject(err));
}

module.exports = {
  fetchAll,
  getAll,
  getById,
  getByCampaignId,
  getDefaultTextFromContentfulEntryAndTemplateName,
  getFieldValueFromContentfulEntryAndTemplateName,
  getPostTypeFromContentType,
  getTemplateInfoFromContentfulEntryAndTemplateName,
  isTopicForCampaignId,
  parseTemplateFromContentfulEntryAndTemplateName,
  parseTemplatesFromContentfulEntryAndCampaign,
  parseTopicFromContentfulEntry,
};
