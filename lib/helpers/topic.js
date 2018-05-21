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
 * @param {Object} contentfulEntry
 * @return {Promise}
 */
function parseTopicFromContentfulEntry(contentfulEntry) {
  const data = {
    id: contentful.getContentfulIdFromContentfulEntry(contentfulEntry),
    campaignId: contentful.getCampaignIdFromCampaignReferenceOnContentfulEntry(contentfulEntry),
  };
  logger.debug('parseTopicFromContentfulEntry', { data });

  return helpers.cache.topics.set(data.id, data);
}

module.exports = {
  getById,
  parseTopicFromContentfulEntry,
};
