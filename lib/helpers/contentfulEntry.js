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
    return helpers.defaultTopicTrigger.parseDefaultTopicTrigger(contentfulEntry);
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
 * @param {String} templateName - optional
 * @return {Promise}
 */
async function getMessageTemplate(contentfulEntry, templateName) {
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
 * TODO: We need pass a parameter to force clearing cache for all topics within the templates.
 * @param {Object} contentfulEntry
 * @return {Promise}
 */
async function getTopicTemplates(contentfulEntry) {
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);
  const templatesConfig = config.contentTypes[contentType].templates;
  const templates = {};

  if (!contentfulEntry || !templatesConfig) {
    return templates;
  }

  const templateNames = Object.keys(templatesConfig);
  const promises = templateNames.map((templateName) => {
    const templateConfig = templatesConfig[templateName];
    const fieldValue = contentfulEntry.fields[templateConfig.fieldName];
    if (module.exports.isTransitionTemplate(contentType, templateName)) {
      return module.exports.getMessageTemplate(fieldValue);
    }
    return Promise.resolve({
      text: fieldValue || templateConfig.defaultText,
      topic: {},
    });
  });
  const messageTemplates = await Promise.all(promises);
  templateNames.forEach((templateName, index) => {
    templates[templateName] = messageTemplates[index];
  });

  // The first iteration of askYesNo did not use transition fields for saidYes and saidNo templates;
  // it had separate text and topic fields per template. This code block supports entries created
  // during that first iteration -- ideally we could run a migration to backfill these entries with
  // transition references created from the respective text and topic fields.
  if (module.exports.isAskYesNo(contentfulEntry)) {
    const fields = contentfulEntry.fields;
    if (!templates.saidYes || !templates.saidYes.text) {
      const saidYesTopicId = contentful.getContentfulIdFromContentfulEntry(fields.saidYesTopic);
      templates.saidYes = {
        text: fields.saidYes,
        topic: saidYesTopicId ? await helpers.topic.getById(saidYesTopicId) : {},
      };
    }
    if (!templates.saidNo || !templates.saidNo.text) {
      const saidNoTopicId = contentful.getContentfulIdFromContentfulEntry(fields.saidNoTopic);
      templates.saidNo = {
        text: fields.saidNo,
        topic: saidNoTopicId ? await helpers.topic.getById(saidNoTopicId) : {},
      };
    }
  }

  return templates;
}

/**
 * @param {Object} contentfulEntry
 * @return {Boolean}
 */
function isAskYesNo(contentfulEntry) {
  return contentful.isContentType(contentfulEntry, config.contentTypes.askYesNo.type);
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

/**
 * @param {Object} contentfulEntry
 * @return {Boolean}
 */
function isTransitionable(contentfulEntry) {
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);
  return config.contentTypes[contentType].transitionable;
}

/**
 * @param {String} contentType
 * @param {String} templateName
 * @return {Boolean}
 */
function isTransitionTemplate(contentType, templateName) {
  const templatesConfig = config.contentTypes[contentType].templates;
  return templatesConfig[templateName].fieldType === config.templateFieldTypes.transition;
}

module.exports = {
  fetch,
  fetchById,
  formatForApi,
  formatSys,
  getContentTypeConfigs,
  getMessageTemplate,
  getSummaryFromContentfulEntry,
  getTopicTemplates,
  isAskYesNo,
  isAutoReply,
  isBroadcastable,
  isDefaultTopicTrigger,
  isLegacyBroadcast,
  isMessage,
  isTransitionable,
  isTransitionTemplate,
  parseContentfulEntry,
};
