'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');
const config = require('../../config/lib/helpers/topic');

/**
 * @param {Object}
 * @return {Promise}
 */
function fetch(query = {}) {
  return contentful.fetchByContentTypes(config.topicContentTypes, query)
    .then(res => Promise.all(res.items.map(module.exports
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
      // TODO: Loop through all pages of query results - currently returns 100.
      // Note - the reason we want a list of all topics is to easily grab topics by campaignId.
      // Querying Contentful for topics by campaign isn't that easy because we use multiple content
      // types, and can only filter by field for a single content type (not multiple).
      return module.exports.fetch()
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
    name: contentful.getNameTextFromContentfulEntry(contentfulEntry),
    type: contentType,
    postType: module.exports.getPostTypeFromContentType(contentType),
  };
  const campaignConfigEntry = contentfulEntry.fields.campaign;
  let promise = Promise.resolve(null);
  let campaignId;
  if (campaignConfigEntry) {
    campaignId = contentful.getCampaignIdFromContentfulEntry(campaignConfigEntry);
    promise = helpers.campaign.fetchById(campaignId);
  }
  return promise
    .then((campaign) => {
      data.campaign = campaign;
      data.templates = module.exports
        .parseTopicTemplatesFromContentfulEntryAndCampaign(contentfulEntry, campaign);
      return data;
    })
    .catch((error) => {
      if (error.status === 404) {
        // The campaignId is set via freeform text field on the campaign content type.
        // If a topic's campaign is misconfigured, we still want to return topic data.
        // Hardcode the status as closed to auto reply with the campaignClosed template.
        data.campaign = { id: campaignId, status: 'closed' };
        data.templates = module.exports
          .parseTopicTemplatesFromContentfulEntryAndCampaign(contentfulEntry, null);
        return data;
      }
      throw error;
    });
}

/**
 * @param {Object} contentfulEntry
 * @param {Object} campaign
 * @return {Object}
 */
function parseTopicTemplatesFromContentfulEntryAndCampaign(contentfulEntry, campaign) {
  const topicTemplates = module.exports
    .parseTemplatesFromContentfulEntryAndCampaign(contentfulEntry, campaign);
  const campaignConfigEntry = contentfulEntry.fields.campaign;
  if (!campaignConfigEntry) {
    return topicTemplates;
  }
  const campaignConfigTemplates = module.exports
    .parseTemplatesFromContentfulEntryAndCampaign(campaignConfigEntry, campaign);
  return Object.assign(topicTemplates, campaignConfigTemplates);
}

module.exports = {
  fetch,
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
  parseTopicTemplatesFromContentfulEntryAndCampaign,
};
