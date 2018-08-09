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
 * @return {Object}
 */
function getMessageTemplateFromContentfulEntryAndTemplateName(contentfulEntry, templateName) {
  const topicRef = contentfulEntry.fields.topic;
  const topic = topicRef ? { id: contentful.getContentfulIdFromContentfulEntry(topicRef) } : {};
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
 * @return {Object}
 */
function getTopicTemplatesFromContentfulEntry(contentfulEntry) {
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);
  const templateFieldNames = config.contentTypes[contentType].templates;
  const result = {};

  if (!contentfulEntry || !templateFieldNames) {
    return result;
  }

  templateFieldNames.forEach((fieldName) => {
    const text = contentfulEntry.fields[fieldName];
    const topic = {};
    // The saidYes template should change conversation topic to the saidYesTopic field.
    if (fieldName === 'saidYes') {
      const topicRef = contentfulEntry.fields.saidYesTopic;
      if (topicRef) {
        topic.id = contentful.getContentfulIdFromContentfulEntry(topicRef);
      }
    }
    result[fieldName] = {
      text,
      topic,
    };
  });

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
  getById,
  getContentTypeConfigs,
  getMessageTemplateFromContentfulEntryAndTemplateName,
  getSummaryFromContentfulEntry,
  getTopicTemplatesFromContentfulEntry,
  isAutoReply,
  isBroadcastable,
  isDefaultTopicTrigger,
  isLegacyBroadcast,
  isMessage,
  parseContentfulEntry,
};
