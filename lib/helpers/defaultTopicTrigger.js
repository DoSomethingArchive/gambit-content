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
  const configs = helpers.contentfulEntry.getContentTypeConfigs();
  return [configs.defaultTopicTrigger.type];
}

/**
 * @param {Object} query
 * @return {Promise}
 */
function fetch(query = {}) {
  return contentful.fetchByContentTypes(module.exports.getContentTypes(), query)
    .then(contentfulRes => Promise.map(contentfulRes.data, module.exports.parseDefaultTopicTrigger))
    // TODO: We need to modify the meta data too, as we're removing data items here.
    .then(defaultTopicTriggers => module.exports
      .removeInvalidDefaultTopicTriggers(defaultTopicTriggers));
}

/**
 * Removes any null items that may be present from parsing draft Contentful entries.
 * @see parseDefaultTopicTrigger
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
 * Parses a defaultTopicTrigger Contentful entry as data for writing Rivescript to define
 * triggers on the default topic.
 *
 * @param {Object} contentfulEntry - defaultTopicTrigger
 * @return {Promise}
 */
async function parseDefaultTopicTrigger(contentfulEntry) {
  const data = {
    id: contentful.getContentfulIdFromContentfulEntry(contentfulEntry),
    trigger: contentful.getTriggerTextFromDefaultTopicTrigger(contentfulEntry),
  };

  const responseEntry = contentful.getResponseEntryFromDefaultTopicTrigger(contentfulEntry);
  // Check for draft entries that may not contain a response reference.
  if (!responseEntry) {
    return null;
  }

  if (helpers.contentfulEntry.isDefaultTopicTrigger(responseEntry)) {
    data.redirect = contentful.getTriggerTextFromDefaultTopicTrigger(responseEntry);
    return data;
  }

  if (helpers.contentfulEntry.isFaqAnswer(responseEntry)) {
    data.reply = contentful.getTextFromMessage(responseEntry);
    return data;
  }

  if (helpers.contentfulEntry.isTransitionable(responseEntry)) {
    data.reply = contentful.getTextFromMessage(responseEntry);
    data.topic = await helpers.topic
      .getById(contentful.getContentfulIdFromContentfulEntry(responseEntry.fields.topic));
    return data;
  }

  // TODO: This will be removed once all defaultTopicTriggers that reference topic entries (e.g.
  // photoPost, textPost) are updated to reference transition entries (e.g. photoPostTransition).
  // The changeTopicTrigger code in Conversations will be deprecated as well once all entries are
  // backfilled with transition entries.
  data.topicId = contentful.getContentfulIdFromContentfulEntry(responseEntry);
  data.topic = await helpers.topic.getById(data.topicId);
  return data;
}

module.exports = {
  fetch,
  getAll,
  getAllWithCampaignTopics,
  getContentTypes,
  parseDefaultTopicTrigger,
  removeInvalidDefaultTopicTriggers,
};
