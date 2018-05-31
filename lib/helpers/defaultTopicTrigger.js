'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');

const config = require('../../config/lib/helpers/defaultTopicTrigger');

/**
 * @return {Promise}
 */
function fetchAll() {
  // TODO: Loop through all pages of query results - currently returns 100.
  return contentful.fetchByContentTypes(config.defaultTopicTriggerContentTypes)
    .then(contentfulEntries => contentfulEntries.map(module.exports
      .parseDefaultTopicTriggerFromContentfulEntry));
}

/**
 * @return {Promise}
 */
function getAll() {
  return helpers.cache.defaultTopicTriggers.get(config.allDefaultTopicTriggersCacheKey)
    .then((triggers) => {
      if (triggers) {
        logger.debug('All defaultTopicTriggers cache hit', { count: triggers.length });
        return triggers;
      }
      logger.debug('All defaultTopicTriggers cache miss');
      return module.exports.fetchAll()
        .then(defaultTopicTriggers => helpers.cache.defaultTopicTriggers
          .set(config.allDefaultTopicTriggersCacheKey, defaultTopicTriggers));
    });
}

/**
 * @param {String} topicId
 * @return {Promise}
 */
function getByTopicId(topicId) {
  return module.exports.getAll()
    .then(defaultTopicTriggers => defaultTopicTriggers.filter((defaultTopicTrigger) => {
      // Checks for any draft entries that may be missing required field values.
      if (!defaultTopicTrigger) {
        return false;
      }
      return defaultTopicTrigger.topicId === topicId;
    }));
}

/**
 * Parses a defaultTopicTrigger Contentful entry as data for writing Rivescript to define
 * triggers on the default topic.
 *
 * @param {Object} contentfulEntry - defaultTopicTrigger
 * @return {String}
 */
function parseDefaultTopicTriggerFromContentfulEntry(contentfulEntry) {
  const data = {
    id: contentful.getContentfulIdFromContentfulEntry(contentfulEntry),
    trigger: contentful.getTriggerTextFromDefaultTopicTrigger(contentfulEntry),
  };

  const responseEntry = contentful.getResponseEntryFromDefaultTopicTrigger(contentfulEntry);
  if (!responseEntry) {
    return null;
  }

  if (contentful.isDefaultTopicTrigger(responseEntry)) {
    data.redirect = contentful.getTriggerTextFromDefaultTopicTrigger(responseEntry);
    return data;
  }

  if (contentful.isMessage(responseEntry)) {
    data.reply = contentful.getTextFromMessage(responseEntry);
    return data;
  }

  data.topicId = contentful.getContentfulIdFromContentfulEntry(responseEntry);
  return data;
}

module.exports = {
  fetchAll,
  getAll,
  getByTopicId,
  parseDefaultTopicTriggerFromContentfulEntry,
};
