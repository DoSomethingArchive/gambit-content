'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');

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
 * @return {Promise}
 */
async function parseTopicFromContentfulEntry(contentfulEntry) {
  if (helpers.contentfulEntry.isBroadcastable(contentfulEntry)) {
    return helpers.broadcast.parseBroadcastFromContentfulEntry(contentfulEntry);
  }

  const data = helpers.contentfulEntry.getSummaryFromContentfulEntry(contentfulEntry);

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
  data.templates = await helpers.contentfulEntry.getTopicTemplates(contentfulEntry);
  return data;
}

module.exports = {
  fetch,
  fetchById,
  getById,
  getContentTypes,
  isTopicForCampaignId,
  parseTopicFromContentfulEntry,
};
