'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');
const config = require('../../config/lib/helpers/broadcast');

/**
 * @return {Promise}
 */
function fetchAll() {
  // TODO: Loop through all pages of query results - currently returns 100.
  return contentful.fetchByContentTypes(config.broadcastContentTypes)
    .then(contentfulEntries => Promise.all(contentfulEntries.map(module.exports
      .parseBroadcastFromContentfulEntry)));
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
 * @return {Promise}
 */
function parseBroadcastFromContentfulEntry(contentfulEntry) {
  const data = {
    id: contentful.getContentfulIdFromContentfulEntry(contentfulEntry),
    name: contentful.getNameTextFromContentfulEntry(contentfulEntry),
    createdAt: contentfulEntry.sys.createdAt,
    updatedAt: contentfulEntry.sys.updatedAt,
    message: {
      text: contentfulEntry.fields.message,
      // TODO: Parse from attachments reference field.
      attachments: [],
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
    data.campaignId = contentful.getCampaignIdFromContentfulEntry(campaignConfigEntry);
    data.topic = null;
    data.message.template = contentfulEntry.fields.template || 'askSignup';
  }
  return data;
}

module.exports = {
  fetchAll,
  fetchById,
  getById,
  parseBroadcastFromContentfulEntry,
};
