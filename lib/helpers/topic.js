'use strict';

const logger = require('winston');
const helpers = require('../helpers');
const contentful = require('../contentful');

/**
 * @param {String} topicId
 * @return {Promise}
 */
function getById(topicId) {
  return helpers.cache.topics.get(topicId)
    .then((data) => {
      if (data) {
        logger.debug('Topic cache hit', { topicId });
        return Promise.resolve(data);
      }
      logger.debug('Topic cache miss', { topicId });
      return contentful.fetchByContentfulId(topicId)
        .then(contentfulEntry => module.exports.parseTopicFromContentfulEntry(contentfulEntry));
    });
}

/**
 * @param {String} topicId
 * @return {Promise}
 */
function fetchDefaultTopicTriggersByTopicId(topicId) {
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
  data.reply = `changeTopicTo${data.topicId}`;
  return data;
}

/**
 * @param {Object} contentfulEntry
 * @return {Promise}
 */
function parseTopicFromContentfulEntry(contentfulEntry) {
  const topicId = contentful.getContentfulIdFromContentfulEntry(contentfulEntry);
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);
  const data = {
    id: topicId,
    type: contentType,
    postType: helpers.botConfig.getPostTypeFromContentType(contentType),
  };
  const campaignConfig = contentfulEntry.fields.campaign;
  data.campaignId = contentful.getCampaignIdFromContentfulEntry(campaignConfig);
  const topicTemplates = helpers.botConfig.getTemplatesFromContentfulEntry(contentfulEntry);
  const campaignTemplates = helpers.botConfig.getTemplatesFromContentfulEntry(campaignConfig);
  data.templates = Object.assign(topicTemplates, campaignTemplates);
  logger.debug('parseTopicFromContentfulEntry', { data });

  return module.exports.fetchDefaultTopicTriggersByTopicId(topicId)
    .then((triggerObjects) => {
      // Save linked defaultTopicTriggers as list of the triggers.
      data.defaultTopicTriggers = triggerObjects.map(triggerObject => triggerObject.trigger);
      return helpers.cache.topics.set(topicId, data);
    })
    .then(() => Promise.resolve(data))
    .catch(err => Promise.reject(err));
}

module.exports = {
  fetchDefaultTopicTriggersByTopicId,
  getById,
  parseDefaultTopicTriggerFromContentfulEntry,
  parseTopicFromContentfulEntry,
};
