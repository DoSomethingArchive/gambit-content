'use strict';

const logger = require('winston');
const Promise = require('bluebird');
const contentful = require('../contentful');
const helpers = require('../helpers');

const config = require('../../config/lib/helpers/defaultTopicTrigger');

/**
 * @return {Array}
 */
function getContentTypes() {
  return config.contentTypes;
}

/**
 * @param {Object} query
 * @return {Promise}
 */
function fetch(query = {}) {
  return contentful.fetchByContentTypes(module.exports.getContentTypes(), query)
    .then(contentfulRes => Promise.map(contentfulRes.data, module.exports
      .parseDefaultTopicTriggerFromContentfulEntry))
    .then(defaultTopicTriggers => module.exports
      .removeInvalidDefaultTopicTriggers(defaultTopicTriggers));
}

/**
 * Removes any null items that may be present from parsing draft Contentful entries.
 * @see parseDefaultTopicTriggerFromContentfulEntry
 *
 * @param {Array}
 * @return {Array}
 */
function removeInvalidDefaultTopicTriggers(defaultTopicTriggers) {
  return defaultTopicTriggers.filter(defaultTopicTrigger => defaultTopicTrigger);
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
      // TODO: If total count of defaultTopicTriggers is greater than number of results returned,
      // execute multiple requests to cache all defaultTopicTriggers.
      // We want the list of all triggers cached, as a Conversations restart requires each dyno
      // to fetch the index to load all Rivescript.
      return module.exports.fetch()
        .then(defaultTopicTriggers => helpers.cache.defaultTopicTriggers
          .set(config.allDefaultTopicTriggersCacheKey, defaultTopicTriggers));
    });
}

/**
 * @return {Promise}
 */
function getAllWithCampaignTopics() {
  return module.exports.getAll().then(defaultTopicTriggers => defaultTopicTriggers
    .filter(trigger => trigger.topic && trigger.topic.campaign));
}

/**
 * @param {String} topicId
 * @return {Promise}
 */
function getByTopicId(topicId) {
  return module.exports.getAll()
    .then(defaultTopicTriggers => defaultTopicTriggers
      .filter(defaultTopicTrigger => defaultTopicTrigger.topicId === topicId));
}

/**
 * @param {Array} defaultTopicTriggers
 * @return {Array}
 */
function getTriggersFromDefaultTopicTriggers(defaultTopicTriggers) {
  return defaultTopicTriggers.map(defaultTopicTrigger => defaultTopicTrigger.trigger);
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
    return Promise.resolve(null);
  }

  if (helpers.contentfulEntry.isDefaultTopicTrigger(responseEntry)) {
    data.redirect = contentful.getTriggerTextFromDefaultTopicTrigger(responseEntry);
    return Promise.resolve(data);
  }

  if (helpers.contentfulEntry.isMessage(responseEntry)) {
    data.reply = contentful.getTextFromMessage(responseEntry);
    return Promise.resolve(data);
  }

  data.topicId = contentful.getContentfulIdFromContentfulEntry(responseEntry);
  return helpers.topic.fetchById(data.topicId)
    .then((topic) => {
      data.topic = topic;
      return data;
    });
}

module.exports = {
  fetch,
  getAll,
  getAllWithCampaignTopics,
  getByTopicId,
  getContentTypes,
  getTriggersFromDefaultTopicTriggers,
  parseDefaultTopicTriggerFromContentfulEntry,
  removeInvalidDefaultTopicTriggers,
};
