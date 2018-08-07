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
async function fetch(query = {}) {
  const contentfulRes = await contentful
    .fetchByContentTypes(module.exports.getContentTypes(), query);
  const broadcasts = await Promise
    .all(contentfulRes.data.map(module.exports.parseBroadcastFromContentfulEntry));
  return Object.assign(contentfulRes, { data: broadcasts });
}

/**
 * Fetches a Contentful entry and parses as a broadcast.
 *
 * @param {String} broadcastId
 * @return {Promise}
 */
function fetchById(broadcastId) {
  return contentful.fetchByContentfulId(broadcastId)
    .then(module.exports.parseBroadcastFromContentfulEntry)
    .then(broadcast => helpers.cache.broadcasts.set(broadcastId, broadcast));
}

/**
 * @param {String} broadcastId
 * @param {Boolean} resetCache
 * @return {Promise}
 */
function getById(broadcastId, resetCache = false) {
  if (resetCache === true) {
    logger.debug('Broadcast cache reset', { broadcastId });
    return module.exports.fetchById(broadcastId);
  }
  return helpers.cache.broadcasts.get(broadcastId)
    .then((data) => {
      if (data) {
        logger.debug('Broadcast cache hit', { broadcastId });
        return data;
      }
      logger.debug('Broadcast cache miss', { broadcastId });
      return module.exports.fetchById(broadcastId);
    });
}

/**
 * @param {Object} contentfulEntry
 * @return {Promise}
 */
function parseBroadcastFromContentfulEntry(contentfulEntry) {
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);
  const contentTypeConfigs = config.contentTypes;

  // A nice to have TODO is migrating all legacy broadcast entries into the respective new type, so
  // we can remove check and the function it calls entirely.
  if (contentType === contentTypeConfigs.legacy.type) {
    return module.exports.parseLegacyBroadcastFromContentfulEntry(contentfulEntry);
  }

  const data = helpers.contentfulEntry.getNameInfoFromContentfulEntry(contentfulEntry);
  const message = module.exports
    .parseBroadcastMessageFromContentfulEntryAndTemplateName(contentfulEntry, contentType);
  const fieldNames = contentTypeConfigs[contentType].templates;
  const templates = module.exports
    .parseTemplatesFromContentfulEntryAndFieldNames(contentfulEntry, fieldNames);

  return Promise.resolve(Object.assign(data, { message, templates }));
}

/**
 * The 'broadcast' content type was used to send various types of broadcasts, which will soon be
 * deprecated by new content types per broadcast type.
 *
 * @param {Object} contentfulEntry
 * @return {Promise}
 */
function parseLegacyBroadcastFromContentfulEntry(contentfulEntry) {
  const data = helpers.contentfulEntry.getNameInfoFromContentfulEntry(contentfulEntry);
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
    // TODO: Return this as an object once Conversations is updated to check if topic is an object
    // first before checking it as a string. This will be removed when we're no longer dependent on
    // the legacy broadcast content type.
    data.topic = hardcodedTopic;
    data.message.template = 'rivescript';
  } else {
    const campaignConfigEntry = contentfulEntry.fields.campaign;
    data.campaignId = Number(contentful.getCampaignIdFromContentfulEntry(campaignConfigEntry));
    data.topic = null;
    data.message.template = contentfulEntry.fields.template || 'askSignup';
  }
  return Promise.resolve(data);
}

/**
 * @param {Object} contentfulEntry
 * @return {Object}
 */
function parseBroadcastMessageFromContentfulEntryAndTemplateName(contentfulEntry, templateName) {
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);
  const broadcastMessageEntry = contentfulEntry.fields[contentType];

  if (!broadcastMessageEntry) {
    return null;
  }
  return helpers.contentfulEntry
    .getMessageTemplateFromContentfulEntryAndTemplateName(broadcastMessageEntry, templateName);
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
  parseBroadcastMessageFromContentfulEntryAndTemplateName,
  parseLegacyBroadcastFromContentfulEntry,
  parseTemplatesFromContentfulEntryAndFieldNames,
};
