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
      .parseTopicFromContentfulEntry)));
}

/**
 * @param {String} topicId
 * @return {Promise}
 */
function fetchById(topicId) {
  return contentful.fetchByContentfulId(topicId)
    .then(contentfulEntry => module.exports.parseTopicFromContentfulEntry(contentfulEntry));
}

/**
 * @return {Promise}
 */
function getAll() {
  const allTopicsKey = config.allTopicsCacheKey;
  return helpers.cache.topics.get(allTopicsKey)
    .then((allTopics) => {
      if (allTopics) {
        logger.debug('All topics cache hit', { count: allTopics.length });
        return allTopics;
      }
      logger.debug('All topics cache miss');
      return module.exports.fetchAll()
        .then(topics => Promise.all(topics.map(topic => helpers.cache.topics
          .set(topic.id, topic))))
        .then(topics => helpers.cache.topics.set(allTopicsKey, topics));
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
        return data;
      }
      logger.debug('Topic cache miss', { topicId });
      return module.exports.fetchById(topicId)
        .then(topic => helpers.cache.topics.set(topicId, topic));
    });
}

/**
 * @param {String} campaignId
 * @return {Promise}
 */
function getByCampaignId(campaignId) {
  return module.exports.getAll()
    .then(topics => topics.filter(topic => module.exports.isTopicForCampaignId(topic, campaignId)));
}

/**
 * @param {Object} topic
 * @param {String} campaignId
 * @return {Boolean}
 */
function isTopicForCampaignId(topic, campaignId) {
  const result = topic.campaign && topic.campaign.id === Number(campaignId);
  return result;
}

/**
 * @param {Object} contentfulEntry
 * @param {String} templateName
 * @return {Object}
 */
function getTemplateInfoFromContentfulEntryAndTemplateName(contentfulEntry, templateName) {
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);
  return config.templatesByContentType[contentType][templateName];
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
      return data;
    })
    .catch((error) => {
      if (error.status === 404) {
        // The campaignId is set via freeform text field on the campaign content type.
        // If a topic's campaign is misconfigured, we still want to return the topic data, no throw.
        data.campaign = { id: campaignId, status: '404' };
        return data;
      }
      throw error;
    });
}

module.exports = {
  fetchAll,
  fetchById,
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
