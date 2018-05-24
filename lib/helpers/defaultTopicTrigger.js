'use strict';

const logger = require('winston');
const contentful = require('../contentful');
const helpers = require('../helpers');

const allDefaultTopicTriggersKey = 'all';

/**
 * @return {Promise}
 */
function fetchAll() {
  // TODO: Loop through all pages of query results - currently returns 100.
  return contentful.fetchDefaultTopicTriggers()
    .then(contentfulEntries => contentfulEntries.map(module.exports
      .parseDefaultTopicTriggerFromContentfulEntry))
    .then(triggers => helpers.cache.defaultTopicTriggers.set(allDefaultTopicTriggersKey, triggers));
}

/**
 * @return {Promise}
 */
function getAll() {
  return helpers.cache.defaultTopicTriggers.get(allDefaultTopicTriggersKey)
    .then((triggers) => {
      if (triggers) {
        logger.debug('All defaultTopicTriggers cache hit', { count: triggers.length });
        return Promise.resolve(triggers);
      }
      logger.debug('All defaultTopicTriggers cache miss');
      return module.exports.fetchAll();
    })
    .catch(err => Promise.reject(err));
}

/**
 * @param {String} topicId
 * @return {Promise}
 */
function getByTopicId(topicId) {
  return module.exports.getAll()
    .then(triggers => Promise.resolve(triggers
      .filter(trigger => trigger && trigger.topicId === topicId)))
    .catch(err => Promise.reject(err));
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
  getAll,
  getByTopicId,
  parseDefaultTopicTriggerFromContentfulEntry,
};
