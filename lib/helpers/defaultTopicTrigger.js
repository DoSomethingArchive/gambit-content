'use strict';

const logger = require('winston');
const Promise = require('bluebird');
const contentful = require('../contentful');
const helpers = require('../helpers');

const config = require('../../config/lib/helpers/defaultTopicTrigger');

/**
 * @param {Number} skip
 * @return {Promise}
 */
function fetchAll(skip = 0) {
  return contentful.fetchByContentTypes(config.defaultTopicTriggerContentTypes, skip)
    .then(res => Promise.map(res.items, module.exports
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
      return module.exports.fetchAll()
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

  if (contentful.isDefaultTopicTrigger(responseEntry)) {
    data.redirect = contentful.getTriggerTextFromDefaultTopicTrigger(responseEntry);
    return Promise.resolve(data);
  }

  if (contentful.isMessage(responseEntry)) {
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
  fetchAll,
  getAll,
  getAllWithCampaignTopics,
  getByTopicId,
  getTriggersFromDefaultTopicTriggers,
  parseDefaultTopicTriggerFromContentfulEntry,
  removeInvalidDefaultTopicTriggers,
};
