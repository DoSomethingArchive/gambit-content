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

function getContentType(contentfulEntry) {
  return contentful.getContentTypeFromContentfulEntry(contentfulEntry);
}

/**
 * @param {Object} contentfulEntry
 * @param {Promise}
 */
function parseContentfulEntry(contentfulEntry) {
  const contentType = module.exports.getContentType(contentfulEntry);

  if (helpers.broadcast.getContentTypes().includes(contentType)) {
    return Promise.resolve(helpers.broadcast.parseBroadcastFromContentfulEntry(contentfulEntry));
  }

  if (helpers.topic.getContentTypes().includes(contentType)) {
    return helpers.topic.parseTopicFromContentfulEntry(contentfulEntry);
  }

  return Promise.resolve(contentfulEntry);
}

module.exports = {
  getById,
  getContentType,
  parseContentfulEntry,
};
