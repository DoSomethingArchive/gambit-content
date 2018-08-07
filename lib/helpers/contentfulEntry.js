'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');

/**
 * @param {String} contentfulId
 * @param {Promise}
 */
function getById(contentfulId) {
  return contentful.fetchByContentfulId(contentfulId)
    .then(module.exports.parseContentfulEntry);
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
function getNameInfoFromContentfulEntry(contentfulEntry) {
  const result = {
    id: contentful.getContentfulIdFromContentfulEntry(contentfulEntry),
    name: contentful.getNameTextFromContentfulEntry(contentfulEntry),
    type: contentful.getContentTypeFromContentfulEntry(contentfulEntry),
    createdAt: contentfulEntry.sys.createdAt,
    updatedAt: contentfulEntry.sys.updatedAt,
  };
  logger.debug('parseNameInfoFromContentfulEntry', { result });
  return result;
}

/**
 * @param {Object} contentfulEntry
 * @param {String} templateName
 * @return {Object}
 */
function getMessageTemplateFromContentfulEntryAndTemplateName(contentfulEntry, templateName) {
  if (!module.exports.isMessage(contentfulEntry)) {
    return {
      template: 'changeTopic',
      topic: module.exports.getNameInfoFromContentfulEntry(contentfulEntry),
    };
  }

  return {
    text: contentful.getTextFromMessage(contentfulEntry),
    attachments: contentful.getAttachmentsFromContentfulEntry(contentfulEntry),
    template: templateName,
  };
}

/**
 * @param {Object} contentfulEntry
 * @return {Boolean}
 */
function isMessage(contentfulEntry) {
  return contentful.isContentType(contentfulEntry, 'message');
}

module.exports = {
  getById,
  getMessageTemplateFromContentfulEntryAndTemplateName,
  getNameInfoFromContentfulEntry,
  isMessage,
  parseContentfulEntry,
};
