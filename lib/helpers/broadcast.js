'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');

/**
 * @return {Array}
 */
function getContentTypes() {
  const configs = Object.values(helpers.contentfulEntry.getContentTypeConfigs());
  return configs.filter(config => config.broadcastable).map(config => config.type);
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
async function parseBroadcastFromContentfulEntry(contentfulEntry) {
  const data = helpers.contentfulEntry.getSummaryFromContentfulEntry(contentfulEntry);
  // A nice to have TODO would be migrating all legacy broadcast entries into their new respective
  // type to avoid this check, but it likely is not possible to change type of an existing entry.
  if (helpers.contentfulEntry.isLegacyBroadcast(contentfulEntry)) {
    return Object.assign(data, module.exports
      .getLegacyBroadcastDataFromContentfulEntry(contentfulEntry));
  }
  // Parse the outbound broadcast message to send.
  const message = await helpers.contentfulEntry
    .getMessageTemplateFromContentfulEntryAndTemplateName(contentfulEntry, data.type);
  // Parse topic templates if they exist.
  const templates = await helpers.contentfulEntry
    .getTopicTemplatesFromContentfulEntry(contentfulEntry);
  return Object.assign(data, { message, templates });
}

/**
 * The 'broadcast' content type was used to send various types of broadcasts, which will soon be
 * deprecated by new content types per broadcast type.
 *
 * @param {Object} contentfulEntry
 * @return {Object}
 */
function getLegacyBroadcastDataFromContentfulEntry(contentfulEntry) {
  const data = {
    message: {
      text: contentfulEntry.fields.message,
      attachments: contentful.getAttachmentsFromContentfulEntry(contentfulEntry),
    },
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
    // Ancient legacy broadcasts didn't require the template field, because at the time, we only
    // supported askSignup broadcasts.
    data.message.template = contentfulEntry.fields.template || 'askSignup';
  }
  return data;
}

module.exports = {
  fetch,
  fetchById,
  getById,
  getContentTypes,
  getLegacyBroadcastDataFromContentfulEntry,
  parseBroadcastFromContentfulEntry,
};
