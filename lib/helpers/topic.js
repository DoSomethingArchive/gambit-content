'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');
const config = require('../../config/lib/helpers/topic');

/**
 * @return {Array}
 */
function getContentTypes() {
  const configs = Object.values(helpers.contentfulEntry.getContentTypeConfigs());
  // Return any configs that have templates set, or a postType.
  // We'll eventually refactor this config to only check for existence of templates, with each item
  // corresponding to a reference field to a message or changeTopicMessage entry, like how it does
  // in an askYesNo or autoReply topic (vs a textPostConfig or photoPostConfig, where we're using
  // text fields and the fieldName map defined in the topic helper config).
  return configs.filter(typeConfig => typeConfig.templates || typeConfig.postType)
    .map(typeConfig => typeConfig.type);
}

/**
 * @param {Object} query
 * @return {Promise}
 */
async function fetch(query = {}) {
  const contentfulRes = await contentful
    .fetchByContentTypes(module.exports.getContentTypes(), query);
  const topics = await Promise
    .all(contentfulRes.data.map(module.exports.parseTopicFromContentfulEntry));
  return Object.assign(contentfulRes, { data: topics });
}

/**
 * @param {String} topicId
 * @return {Promise}
 */
function fetchById(topicId) {
  return contentful.fetchByContentfulId(topicId)
    .then(module.exports.parseTopicFromContentfulEntry)
    .then(topic => helpers.cache.topics.set(topicId, topic));
}

/**
 * TODO: We're caching a list of all topics to make it easy to find topics by campaign id. Slowly
 * starting to move away from using this (and leaving it to something like GraphQL to querying by
 * nested object properties.
 *
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
        .then(fetchResult => Promise.all(fetchResult.data.map(topic => helpers.cache.topics
          .set(topic.id, topic))))
        .then(topics => helpers.cache.topics.set(allTopicsKey, topics));
    });
}

/**
 * @param {String} topicId
 * @param {Boolean}
 * @return {Promise}
 */
function getById(topicId, resetCache = false) {
  if (resetCache === true) {
    logger.debug('Topic cache reset', { topicId });
    return module.exports.fetchById(topicId);
  }

  return helpers.cache.topics.get(topicId)
    .then((data) => {
      if (data) {
        logger.debug('Topic cache hit', { topicId });
        return data;
      }
      logger.debug('Topic cache miss', { topicId });
      return module.exports.fetchById(topicId);
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
 * @param {Object} contentfulEntry
 * @param {String} templateName
 * @return {String}
 */
function getDefaultTextFromContentfulEntryAndTemplateName(contentfulEntry, templateName) {
  const templateInfo = module.exports
    .getTemplateInfoFromContentfulEntryAndTemplateName(contentfulEntry, templateName);
  return templateInfo.defaultText;
}

/**
 * @param {Object} contentfulEntry
 * @param {String} templateName
 * @return {String}
 */
function getFieldValueFromContentfulEntryAndTemplateName(contentfulEntry, templateName) {
  const templateInfo = module.exports
    .getTemplateInfoFromContentfulEntryAndTemplateName(contentfulEntry, templateName);
  return contentfulEntry.fields[templateInfo.fieldName];
}

/**
 * Returns an object with two properties:
 * - raw - String saved in the field for the given templateName, or default value if not set
 * - override - Boolean, true when a field value exists
 *
 * @param {Object} contentfulEntry
 * @param {String} templateName
 * @return {Object}
 */
function parseRawAndOverride(contentfulEntry, templateName) {
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
 * Returns the contentfulEntry's text field values (or default values) as templates, rendering any
 * tags with the given campaign, e.g. Thanks for signing up for {{title}}!
 *
 * @param {Object} contentfulEntry
 * @param {Object} campaign
 * @return {Object}
 */
function getTemplates(contentfulEntry, campaign) {
  const data = {};
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);
  const templateNames = Object.keys(config.templatesByContentType[contentType]);
  templateNames.forEach((templateName) => {
    data[templateName] = module.exports.parseRawAndOverride(contentfulEntry, templateName);
    data[templateName].text = helpers.replacePhoenixCampaignVars(data[templateName].raw, campaign);
    // TODO: Remove rendered property once Gambit Conversations references text.
    data[templateName].rendered = data[templateName].text;
  });

  return data;
}

/**
 * @param {String} contentType
 * @return {String}
 */
function getPostTypeFromContentType(contentType) {
  const contentTypeConfigs = helpers.contentfulEntry.getContentTypeConfigs();
  return contentTypeConfigs[contentType].postType;
}

/**
 * @param {Object} contentfulEntry
 * @return {Promise}
 */
async function parseTopicFromContentfulEntry(contentfulEntry) {
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);

  if (helpers.contentfulEntry.isBroadcastable(contentfulEntry)) {
    return helpers.broadcast.parseBroadcastFromContentfulEntry(contentfulEntry);
  }

  const data = helpers.contentfulEntry.getSummaryFromContentfulEntry(contentfulEntry);
  data.postType = module.exports.getPostTypeFromContentType(contentType);

  // Get campaign if topic has a campaign set.
  const campaignConfigEntry = contentfulEntry.fields.campaign;
  const campaignId = campaignConfigEntry ? contentful
    .getCampaignIdFromContentfulEntry(campaignConfigEntry) : null;

  try {
    data.campaign = campaignId ? await helpers.campaign.getById(campaignId) : {};
  } catch (error) {
    // The campaignId value is set by manual input in Contentful, when adding or editing a campaign
    // entry. If a topic campaign is misconfigured, we still want to return topic data.
    if (error.status === 404) {
      // Hardcode status as closed to avoid posting activity for an unknown campaign.
      // TODO: Get status value from campaign helper config instead of hardcoding here.
      data.campaign = { id: campaignId, status: 'closed' };
    } else {
      throw error;
    }
  }

  // Templates for autoReply topics are configured via the contentfulEntry helper.
  if (helpers.contentfulEntry.isAutoReply(contentfulEntry)) {
    data.templates = await helpers.contentfulEntry
      .getTopicTemplatesFromContentfulEntry(contentfulEntry);
    return data;
  }

  // The older types (textPostConfig, photoPostConfig, externalPostConfig) are configured via this
  // topic helper's config, where we've hardcoded default values (and also have Contentful field
  // names that don't match the template names). A rainy day TODO here would be to migrate the field
  // names to DRY all template/field name mapping.
  data.templates = module.exports
    .getTopicTemplates(contentfulEntry, data.campaign);
  return data;
}

/**
 * @param {Object} contentfulEntry
 * @param {Object} campaign
 * @return {Object}
 */
function getTopicTemplates(contentfulEntry, campaign) {
  const topicTemplates = module.exports
    .getTemplates(contentfulEntry, campaign);
  const campaignConfigEntry = contentfulEntry.fields.campaign;
  if (!campaignConfigEntry) {
    return topicTemplates;
  }
  const campaignConfigTemplates = module.exports
    .getTemplates(campaignConfigEntry, campaign);
  return Object.assign(topicTemplates, campaignConfigTemplates);
}

module.exports = {
  fetch,
  fetchById,
  getAll,
  getById,
  getByCampaignId,
  getContentTypes,
  getDefaultTextFromContentfulEntryAndTemplateName,
  getFieldValueFromContentfulEntryAndTemplateName,
  getPostTypeFromContentType,
  getTemplateInfoFromContentfulEntryAndTemplateName,
  getTemplates,
  getTopicTemplates,
  isTopicForCampaignId,
  parseRawAndOverride,
  parseTopicFromContentfulEntry,
};
