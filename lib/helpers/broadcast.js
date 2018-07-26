'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');
const config = require('../../config/lib/helpers/broadcast');

/**
 * @return {Array}
 */
function getContentTypes() {
  const contentTypeConfigs = Object.values(config.contentTypes);
  return contentTypeConfigs.map(contentTypeConfig => contentTypeConfig.type);
}

/**
 * Fetches broadcast Contentful entries and parses them as broadcasts.
 *
 * @param {Object} query
 * @return {Promise}
 */
function fetch(query = {}) {
  return contentful.fetchByContentTypes(module.exports.getContentTypes(), query)
    .then(contentfulRes => ({
      meta: contentfulRes.meta,
      data: contentfulRes.data.map(module.exports.parseBroadcastFromContentfulEntry),
    }));
}

/**
 * Fetches a Contentful entry and parses as a broadcast.
 *
 * @param {String} broadcastId
 * @return {Promise}
 */
function fetchById(broadcastId) {
  return contentful.fetchByContentfulId(broadcastId)
    .then(contentfulEntry => module.exports.parseBroadcastFromContentfulEntry(contentfulEntry));
}

/**
 * @param {String} topicId
 * @return {Promise}
 */
function getById(broadcastId) {
  return helpers.cache.broadcasts.get(broadcastId)
    .then((data) => {
      if (data) {
        logger.debug('Broadcast cache hit', { broadcastId });
        return data;
      }
      logger.debug('Broadcast cache miss', { broadcastId });
      return module.exports.fetchById(broadcastId)
        .then(broadcast => helpers.cache.broadcasts.set(broadcastId, broadcast));
    });
}

/**
 * @param {Object} contentfulEntry
 * @return {Object}
 */
function parseBroadcastInfoFromContentfulEntry(contentfulEntry) {
  return {
    id: contentful.getContentfulIdFromContentfulEntry(contentfulEntry),
    name: contentful.getNameTextFromContentfulEntry(contentfulEntry),
    type: contentful.getContentTypeFromContentfulEntry(contentfulEntry),
    createdAt: contentfulEntry.sys.createdAt,
    updatedAt: contentfulEntry.sys.updatedAt,
  };
}

/**
 * @param {Object} contentfulEntry
 * @return {Object}
 */
function parseBroadcastFromContentfulEntry(contentfulEntry) {
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);
  const contentTypeConfigs = config.contentTypes;

  // A nice to have TODO is migrating all legacy broadcast entries into the respective new type, so
  // we can remove check and the function it calls entirely.
  if (contentType === contentTypeConfigs.legacy.type) {
    return module.exports.parseLegacyBroadcastFromContentfulEntry(contentfulEntry);
  }

  const data = module.exports.parseBroadcastInfoFromContentfulEntry(contentfulEntry);
  const message = module.exports
    .parseBroadcastMessageFromContentfulEntryAndTemplateName(contentfulEntry, contentType);
  const fieldNames = contentTypeConfigs[contentType].templates;
  const templates = module.exports
    .parseTemplatesFromContentfulEntryAndFieldNames(contentfulEntry, fieldNames);

  return Object.assign(data, { message, templates });
}

/**
 * The 'broadcast' content type was used to send various types of broadcasts, which will soon be
 * deprecated by new content types per broadcast type.
 *
 * @param {Object} contentfulEntry
 * @return {Object}
 */
function parseLegacyBroadcastFromContentfulEntry(contentfulEntry) {
  const data = module.exports.parseBroadcastInfoFromContentfulEntry(contentfulEntry);
  data.message = {
    text: contentfulEntry.fields.message,
    attachments: contentful.getAttachmentsFromContentfulEntry(contentfulEntry),
  };
  // This content type was used to send all types of broadcasts and has since been deprecated.
  const hardcodedTopic = contentfulEntry.fields.topic;
  if (hardcodedTopic) {
    // Another note: the new broadcast content types will reference a topic Contentful entry, not
    // a campaign Contentful entry -- eventually topic will be returned as a nested object.
    data.campaignId = null;
    data.topic = hardcodedTopic;
    data.message.template = 'rivescript';
  } else {
    const campaignConfigEntry = contentfulEntry.fields.campaign;
    data.campaignId = Number(contentful.getCampaignIdFromContentfulEntry(campaignConfigEntry));
    data.topic = null;
    data.message.template = contentfulEntry.fields.template || 'askSignup';
  }
  return data;
}

/**
 * @param {Object} contentfulEntry
 * @return {Object}
 */
function parseBroadcastMessageFromContentfulEntryAndTemplateName(contentfulEntry, templateName) {
  const broadcastMessage = contentfulEntry.fields.broadcast;
  return helpers.contentfulEntry
    .getMessageTemplateFromContentfulEntryAndTemplateName(broadcastMessage, templateName);
}

/**
 * @param {Object}
 * @param {String}
 * @return {Object}
 */
function parseTemplatesFromContentfulEntryAndFieldNames(contentfulEntry, fieldNames) {
  const data = {};
  if (!contentfulEntry) {
    return data;
  }
  fieldNames.forEach((fieldName) => {
    logger.debug('fieldName', { fieldName });
    const messageEntry = contentfulEntry.fields[fieldName];
    if (!messageEntry) {
      return;
    }
    data[fieldName] = helpers.contentfulEntry
      .getMessageTemplateFromContentfulEntryAndTemplateName(messageEntry, fieldName);
  });
  return data;
}

module.exports = {
  fetch,
  fetchById,
  getById,
  getContentTypes,
  parseBroadcastFromContentfulEntry,
  parseBroadcastInfoFromContentfulEntry,
  parseBroadcastMessageFromContentfulEntryAndTemplateName,
  parseLegacyBroadcastFromContentfulEntry,
  parseTemplatesFromContentfulEntryAndFieldNames,
};
