'use strict';

const contentful = require('../contentful');

/**
 * @return {Promise}
 */
function fetchAll() {
  // TODO: Loop through all pages of query results - currently returns 100.
  return contentful.fetchDefaultTopicTriggers()
    .then(contentfulEntries => contentfulEntries.map(module.exports
      .parseDefaultTopicTriggerFromContentfulEntry));
}

/**
 * @param {String} topicId
 * @return {Promise}
 */
function getByTopicId(topicId) {
  return contentful.fetchByResponseReferenceContentfulId(topicId)
    .then(contentfulEntries => contentfulEntries.map(module.exports
      .parseDefaultTopicTriggerFromContentfulEntry));
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
  getByTopicId,
  parseDefaultTopicTriggerFromContentfulEntry,
};
