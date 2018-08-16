'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');
const config = require('../../config/lib/helpers/contentfulEntry');

/**
 * @return {Array}
 */
function getContentTypeConfigs() {
  return config.contentTypes;
}

/**
 * @param {String} contentfulId
 * @param {Promise}
 */
function getById(contentfulId) {
  return contentful.fetchByContentfulId(contentfulId)
    .then(module.exports.parseContentfulEntry);
}

/**
 * @param {String} campaignId
 * @return {Promise}
 */
async function fetchCampaignConfigByCampaignId(campaignId) {
  const result = await contentful.fetchEntries({
    content_type: 'campaign',
    'fields.campaignId': campaignId,
  });
  return module.exports.parseCampaignConfig(result.items[0]);
}

/**
 * @param {Object} contentfulEntry
 * @return {Object}
 */
function parseCampaignConfig(contentfulEntry) {
  return {
    id: contentful.getContentfulIdFromContentfulEntry(contentfulEntry),
  };
}

/**
 * @param {Object} contentfulEntry
 * @param {Promise}
 */
function parseContentfulEntry(contentfulEntry) {
  // TODO: It might be nice to move all of these type of functions into this helper, to restrict
  // lib/contentful to simply querying Contentful API.
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);

  if (helpers.broadcast.getContentTypes().includes(contentType)) {
    return helpers.broadcast.parseBroadcastFromContentfulEntry(contentfulEntry);
  }

  if (helpers.topic.getContentTypes().includes(contentType)) {
    return helpers.topic.parseTopicFromContentfulEntry(contentfulEntry);
  }

  if (helpers.defaultTopicTrigger.getContentTypes().includes(contentType)) {
    return helpers.defaultTopicTrigger.parseDefaultTopicTriggerFromContentfulEntry(contentfulEntry);
  }

  return Promise.resolve(contentfulEntry);
}

/**
 * @param {Object} contentfulEntry
 * @return {Object}
 */
function getSummaryFromContentfulEntry(contentfulEntry) {
  const result = {
    id: contentful.getContentfulIdFromContentfulEntry(contentfulEntry),
    name: contentful.getNameTextFromContentfulEntry(contentfulEntry),
    type: contentful.getContentTypeFromContentfulEntry(contentfulEntry),
    createdAt: contentfulEntry.sys.createdAt,
    updatedAt: contentfulEntry.sys.updatedAt,
  };
  logger.debug('getSummaryFromContentfulEntry', { result });
  return result;
}

/**
 * @param {Object} contentfulEntry
 * @param {String} templateName
 * @return {Promise}
 */
async function getMessageTemplateFromContentfulEntryAndTemplateName(contentfulEntry, templateName) {
  const topicEntry = contentfulEntry.fields.topic;
  const topic = topicEntry ? await helpers.topic
    .getById(contentful.getContentfulIdFromContentfulEntry(topicEntry)) : {};
  return {
    text: contentful.getTextFromMessage(contentfulEntry),
    attachments: contentful.getAttachmentsFromContentfulEntry(contentfulEntry),
    template: templateName,
    topic,
  };
}

/**
 * @param {Object}
 * @param {String}
 * @return {Promise}
 */
async function getTopicTemplates(contentfulEntry) {
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);
  const templateFieldNames = config.contentTypes[contentType].templates;
  const result = {};

  if (!contentfulEntry || !templateFieldNames) {
    return result;
  }

  templateFieldNames.forEach((fieldName) => {
    result[fieldName] = {
      text: contentfulEntry.fields[fieldName],
      topic: {},
    };
  });

  // The saidYes template should include the topic saved to the saidYesTopic field.
  if (result.saidYes && contentfulEntry.fields.saidYesTopic) {
    result.saidYes.topic = await helpers.topic
      .getById(contentful.getContentfulIdFromContentfulEntry(contentfulEntry.fields.saidYesTopic));
  }

  // The saidNo template should include the topic saved to the saidNoTopic field.
  if (result.saidNo && contentfulEntry.fields.saidNoTopic) {
    result.saidNo.topic = await helpers.topic
      .getById(contentful.getContentfulIdFromContentfulEntry(contentfulEntry.fields.saidNoTopic));
  }

  return result;
}

/**
 * @param {Object} contentfulEntry
 * @return {Boolean}
 */
function isAutoReply(contentfulEntry) {
  return contentful.isContentType(contentfulEntry, config.contentTypes.autoReply.type);
}

/**
 * @param {Object} contentfulEntry
 * @return {Boolean}
 */
function isBroadcastable(contentfulEntry) {
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);
  return config.contentTypes[contentType].broadcastable;
}

/**
 * @param {Object} contentfulEntry
 * @return {Boolean}
 */
function isDefaultTopicTrigger(contentfulEntry) {
  return contentful.isContentType(contentfulEntry, config.contentTypes.defaultTopicTrigger.type);
}

/**
 * @param {Object} contentfulEntry
 * @return {Boolean}
 */
function isLegacyBroadcast(contentfulEntry) {
  return contentful.isContentType(contentfulEntry, config.contentTypes.legacyBroadcast.type);
}

/**
 * @param {Object} contentfulEntry
 * @return {Boolean}
 */
function isMessage(contentfulEntry) {
  return contentful.isContentType(contentfulEntry, config.contentTypes.message.type);
}

module.exports = {
  fetchCampaignConfigByCampaignId,
  getById,
  getContentTypeConfigs,
  getMessageTemplateFromContentfulEntryAndTemplateName,
  getSummaryFromContentfulEntry,
  getTopicTemplates,
  isAutoReply,
  isBroadcastable,
  isDefaultTopicTrigger,
  isLegacyBroadcast,
  isMessage,
  parseCampaignConfig,
  parseContentfulEntry,
};
