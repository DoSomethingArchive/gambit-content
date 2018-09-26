'use strict';

const logger = require('winston');
const Promise = require('bluebird');
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
 * @param {Object} query
 * @return {Promise}
 */
async function fetch(query = {}) {
  const result = await contentful.fetchEntries(query);

  return {
    meta: result.meta,
    data: await Promise.map(result.data, module.exports.formatForApi),
  };
}

/**
 * @param {String} contentfulId
 * @param {Promise}
 */
function fetchById(contentfulId) {
  return contentful.fetchByContentfulId(contentfulId)
    .then(module.exports.formatForApi);
}

/**
 * @param {Object} contentfulEntry
 * @param {Promise}
 */
async function formatForApi(contentfulEntry) {
  return {
    raw: {
      sys: module.exports.formatSys(contentfulEntry),
      // TODO: Loop through fields and call formatSys for any references for readable API responses.
      // @see https://github.com/DoSomething/gambit-campaigns/pull/1081/files#r214998873
      fields: contentfulEntry.fields,
    },
    parsed: await module.exports.parseContentfulEntry(contentfulEntry),
  };
}

/**
 * @param {Object} contentfulEntry
 * @return {Object}
 */
function formatSys(contentfulEntry) {
  return {
    id: contentfulEntry.sys.id,
    contentType: contentfulEntry.sys.contentType,
    createdAt: contentfulEntry.sys.createdAt,
    updatedAt: contentfulEntry.sys.updatedAt,
  };
}

/**
 * @param {Object} contentfulEntry
 * @param {Promise}
 */
function parseContentfulEntry(contentfulEntry) {
  // TODO: It'd be nice to move all of these type of functions into this helper, to restrict
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

  return Promise.resolve(null);
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
  if (!contentfulEntry || !contentfulEntry.fields) {
    return {};
  }
  const topicEntry = contentfulEntry.fields.topic;
  const topic = topicEntry ? await helpers.topic
    .getById(contentful.getContentfulIdFromContentfulEntry(contentfulEntry.fields.topic)) : {};
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
  fetch,
  fetchById,
  formatForApi,
  formatSys,
  getContentTypeConfigs,
  getMessageTemplateFromContentfulEntryAndTemplateName,
  getSummaryFromContentfulEntry,
  getTopicTemplates,
  isAutoReply,
  isBroadcastable,
  isDefaultTopicTrigger,
  isLegacyBroadcast,
  isMessage,
  parseContentfulEntry,
};
