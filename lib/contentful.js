'use strict';

/**
 * Imports.
 */
const contentful = require('contentful');
const logger = require('winston');
const underscore = require('underscore');

const NotFoundError = require('../app/exceptions/NotFoundError');
const config = require('../config/lib/contentful');
const Builder = require('./contentfulQueryBuilder');

const ERROR_PREFIX = 'Contentful:';

/**
 * Gets an instance of the contentful query builder
 *
 * @return {QueryBuilder}
 */
function getQueryBuilder() {
  return new Builder();
}

/**
 * Setup.
 */
let client;

/**
 * createNewClient
 *
 * @return {Object}  client - Contentful client
 */
function createNewClient() {
  try {
    client = contentful.createClient(config.clientOptions);
  } catch (err) {
    // TODO: Log this. Send to Stathat, but alert developers that we're in trouble.
    // @see https://github.com/DoSomething/gambit/issues/714#issuecomment-259838498
    logger.error(module.exports.contentfulError(err));
  }
  return client;
}

/**
 * @param {Object} contentfulEntry
 * @return {Number}
 */
function getCampaignIdFromContentfulEntry(contentfulEntry) {
  if (contentfulEntry && contentfulEntry.fields) {
    return contentfulEntry.fields.campaignId;
  }
  return null;
}

/**
 * getClient - creates and returns a new client if one has not been created.
 *
 * @return {Object}  client
 */
function getClient() {
  if (!client) {
    return module.exports.createNewClient();
  }
  return client;
}

/**
 * Prefixes Contentful identifier to given error.message.
 */
function contentfulError(error) {
  const scope = error;
  scope.message = `${ERROR_PREFIX} ${error.message}`;
  return scope;
}

/**
 * Fetches a Contentful entry by contentfulId.
 * @param {String} contentfulId
 * @return {Promise}
 */
function fetchByContentfulId(contentfulId) {
  logger.debug('contentful.fetchByContentfulId', { contentfulId });
  const query = module.exports.getQueryBuilder()
    .contentfulId(contentfulId)
    .build();
  // We call getEntries instead of getEntry to get loaded reference entries back from Contentful.
  // @see https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/links
  // @see https://stackoverflow.com/a/44425987/1470725
  return module.exports.getClient().getEntries(query)
    .then((res) => {
      const firstEntry = underscore.first(res.items);
      if (!firstEntry) {
        throw new NotFoundError(`${ERROR_PREFIX} Entry not found for ${contentfulId}`);
      }
      return firstEntry;
    })
    .catch((error) => {
      throw module.exports.contentfulError(error);
    });
}

/**
 * Returns Contentful entries with contentType in given contentTypes array.
 *
 * @param {Number} skip
 * @param {Array} contentTypes
 * @return {Promise}
 */
function fetchByContentTypes(contentTypes, skip = 0) {
  logger.debug('fetchByContentTypes', { contentTypes });
  const query = module.exports.getQueryBuilder()
    .contentTypes(contentTypes)
    .skip(skip)
    .orderByDescCreatedAt()
    .build();
  return module.exports.getClient().getEntries(query)
    .catch((error) => {
      throw module.exports.contentfulError(error);
    });
}

/**
 * @param {Object} contentfulEntry
 * @return {String}
 */
function getContentfulIdFromContentfulEntry(contentfulEntry) {
  return contentfulEntry.sys.id;
}

/**
 * @param {Object} contentfulEntry
 * @return {String}
 */
function getContentTypeFromContentfulEntry(contentfulEntry) {
  return contentfulEntry.sys.contentType.sys.id;
}

/**
 * @param {Object} contentfulEntry
 * @return {object}
 */
function getAttachmentsFromContentfulEntry(contentfulEntry) {
  const attachmentsFieldValue = contentfulEntry.fields.attachments;
  if (!attachmentsFieldValue) {
    return [];
  }
  return attachmentsFieldValue.map(assetObject => assetObject.fields.file);
}

/**
 * @param {Object} messageObject - A Contentful entry
 * @return {String}
 */
function getNameTextFromContentfulEntry(contentfulEntry) {
  return contentfulEntry.fields.name;
}

/**
 * @param {Object} defaultTopicTriggerObject
 * @return {Object} - Contentful entry saved to the response reference field
 */
function getResponseEntryFromDefaultTopicTrigger(defaultTopicTriggerObject) {
  return defaultTopicTriggerObject.fields.response;
}

/**
 * @param {Object} defaultTopicTriggerObject - A defaultTopicTrigger Contentful entry
 * @return {String}
 */
function getTriggerTextFromDefaultTopicTrigger(defaultTopicTriggerObject) {
  return defaultTopicTriggerObject.fields.trigger;
}

/**
 * @param {Object} messageObject - A message Contentful entry
 * @return {String}
 */
function getTextFromMessage(messageObject) {
  return messageObject.fields.text;
}

/**
 * @param {Object} contentfulEntry
 * @param {String} contentTypeName
 * @return {Boolean}
 */
function isContentType(contentfulEntry, contentTypeName) {
  const contentType = module.exports.getContentTypeFromContentfulEntry(contentfulEntry);
  return contentType === contentTypeName;
}

/**
 * @param {Object} contentfulEntry
 * @return {Boolean}
 */
function isDefaultTopicTrigger(contentfulEntry) {
  return module.exports.isContentType(contentfulEntry, 'defaultTopicTrigger');
}

/**
 * @param {Object} contentfulEntry
 * @return {Boolean}
 */
function isMessage(contentfulEntry) {
  return module.exports.isContentType(contentfulEntry, 'message');
}

module.exports = {
  contentfulError,
  createNewClient,
  fetchByContentfulId,
  fetchByContentTypes,
  getAttachmentsFromContentfulEntry,
  getCampaignIdFromContentfulEntry,
  getClient,
  getContentfulIdFromContentfulEntry,
  getContentTypeFromContentfulEntry,
  getNameTextFromContentfulEntry,
  getQueryBuilder,
  getResponseEntryFromDefaultTopicTrigger,
  getTextFromMessage,
  getTriggerTextFromDefaultTopicTrigger,
  isContentType,
  isDefaultTopicTrigger,
  isMessage,
};
