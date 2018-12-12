'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');

/**
 * @return {Array}
 */
function getContentTypes() {
  // Topic content types have a templates property.
  return Object.values(helpers.contentfulEntry.getContentTypeConfigs())
    .filter(typeConfig => typeConfig.templates)
    .map(typeConfig => typeConfig.type);
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
  fetchById,
  getById,
  getContentTypes,
  parseTopicFromContentfulEntry,
};
