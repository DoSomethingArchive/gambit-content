'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');
const config = require('../../config/lib/helpers/broadcast');

/**
 * @return {Array}
 */
function getContentTypes() {
  return config.contentTypes;
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
  const data = module.exports.parseBroadcastInfoFromContentfulEntry(contentfulEntry);
  if (data.type === config.legacyContentType) {
    return module.exports.parseLegacyBroadcastFromContentfulEntry(contentfulEntry);
  }
  return module.exports.parseAutoReplyBroadcastFromContentfulEntry(contentfulEntry);
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
function parseAutoReplyBroadcastFromContentfulEntry(contentfulEntry) {
  const data = module.exports.parseBroadcastInfoFromContentfulEntry(contentfulEntry);
  const broadcastMessage = contentfulEntry.fields.broadcast;
  data.message = {
    text: contentful.getTextFromMessage(broadcastMessage),
    attachments: contentful.getAttachmentsFromContentfulEntry(broadcastMessage),
    template: 'autoReplyBroadcast',
  };
  const autoReplyMessage = contentfulEntry.fields.autoReply;
  data.templates = {
    autoReply: {
      text: contentful.getTextFromMessage(autoReplyMessage),
      attachments: contentful.getAttachmentsFromContentfulEntry(autoReplyMessage),
    },
  };
  return data;
}

module.exports = {
  fetch,
  fetchById,
  getById,
  getContentTypes,
  parseAutoReplyBroadcastFromContentfulEntry,
  parseBroadcastFromContentfulEntry,
  parseBroadcastInfoFromContentfulEntry,
  parseLegacyBroadcastFromContentfulEntry,
};
