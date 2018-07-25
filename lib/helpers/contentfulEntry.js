'use strict';

const contentful = require('../contentful');
const helpers = require('../helpers');

/**
 * @param {String} contentfulId
 * @param {Promise}
 */
function getById(contentfulId) {
  return contentful.fetchByContentfulId(contentfulId)
    .then(contentfulEntry => module.exports.parseContentfulEntry(contentfulEntry));
}

/**
 * @param {Object} contentfulEntry
 * @param {Promise}
 */
function parseContentfulEntry(contentfulEntry) {
  // TODO: It'd be nice to move all of these type of functions into this helper, to restrict
  /// lib/contentful to simply querying Contentful API.
  const contentType = contentful.getContentTypeFromContentfulEntry(contentfulEntry);

  if (helpers.broadcast.getContentTypes().includes(contentType)) {
    return Promise.resolve(helpers.broadcast.parseBroadcastFromContentfulEntry(contentfulEntry));
  }

  if (helpers.topic.getContentTypes().includes(contentType)) {
    return helpers.topic.parseTopicFromContentfulEntry(contentfulEntry);
  }

  if (helpers.defaultTopicTrigger.getContentTypes().includes(contentType)) {
    return helpers.defaultTopicTrigger.parseDefaultTopicTriggerFromContentfulEntry(contentfulEntry);
  }

  return Promise.resolve(contentfulEntry);
}

module.exports = {
  getById,
  parseContentfulEntry,
};
