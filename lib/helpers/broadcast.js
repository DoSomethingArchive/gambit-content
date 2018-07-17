'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');
const config = require('../../config/lib/helpers/broadcast');

/**
 * @param {Number} skip
 * @return {Promise}
 */
function fetch(skip = 0) {
  return contentful.fetchByContentTypes(config.broadcastContentTypes, skip)
    .then((res) => {
      const broadcasts = res.items.map(module.exports.parseBroadcastFromContentfulEntry);
      return {
        meta: res.meta,
        data: broadcasts,
      };
    });
}

/**
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
function parseBroadcastFromContentfulEntry(contentfulEntry) {
  const data = {
    id: contentful.getContentfulIdFromContentfulEntry(contentfulEntry),
    name: contentful.getNameTextFromContentfulEntry(contentfulEntry),
    createdAt: contentfulEntry.sys.createdAt,
    updatedAt: contentfulEntry.sys.updatedAt,
    message: {
      text: contentfulEntry.fields.message,
      attachments: contentful.getAttachmentsFromContentfulEntry(contentfulEntry),
    },
  };
  // Note: We plan to split broadcast content type into two separate content types, so editors
  // don't need to remember which fields to include/exclude in order to create a specific type.
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

module.exports = {
  fetch,
  fetchById,
  getById,
  parseBroadcastFromContentfulEntry,
};
