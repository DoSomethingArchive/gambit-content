'use strict';

/**
 * Imports.
 */
const contentful = require('contentful');
const Promise = require('bluebird');
const logger = require('winston');
const underscore = require('underscore');

const NotFoundError = require('../app/exceptions/NotFoundError');
const config = require('../config/lib/contentful');
const Builder = require('./contentfulQueryBuilder');

const ERROR_PREFIX = 'Contentful:';

/**
 * Gets an instance of the contentful query builder
 *
 * @return {QueryBuilder}
 */
function getQueryBuilder() {
  return new Builder();
}

/**
 * Setup.
 */
let client;

/**
 * createNewClient
 *
 * @return {Object}  client - Contentful client
 */
function createNewClient() {
  try {
    client = contentful.createClient(config.clientOptions);
  } catch (err) {
    // TODO: Log this. Send to Stathat, but alert developers that we're in trouble.
    // @see https://github.com/DoSomething/gambit/issues/714#issuecomment-259838498
    logger.error(module.exports.contentfulError(err));
  }
  return client;
}

/**
 * @param {object} contentfulEntry
 * @return {string}
 */
function getCampaignIdFromContentfulEntry(contentfulEntry) {
  if (contentfulEntry && contentfulEntry.fields) {
    return contentfulEntry.fields.campaignId;
  }
  return null;
}

/**
 * getClient - creates and returns a new client if one has not been created.
 *
 * @return {Object}  client
 */
function getClient() {
  if (!client) {
    return module.exports.createNewClient();
  }
  return client;
}

/**
 * Prefixes Contentful identifier to given error.message.
 */
function contentfulError(error) {
  const scope = error;
  scope.message = `${ERROR_PREFIX} ${error.message}`;
  return scope;
}

/**
 * Returns first result of a Contentful getEntries call for the given contentfulId.
 * @param {string} contentfulId
 * @return {Promise}
 */
function fetchByContentfulId(contentfulId) {
  const query = module.exports.getQueryBuilder()
    .contentfulId(contentfulId)
    .build();
  return module.exports.fetchSingleEntry(query);
}

function fetchDefaultTopicTriggers() {
  logger.debug('contentful.fetchDefaultTopicTriggers');
  const query = module.exports.getQueryBuilder()
    .contentType('defaultTopicTrigger')
    .build();
  return module.exports.getClient().getEntries(query)
    .then(res => Promise.resolve(res.items))
    .catch(error => Promise.reject(module.exports.contentfulError(error)));
}

/**
 * Returns first result of a Contentful getEntries call for the given query.
 */
function fetchSingleEntry(query) {
  return new Promise((resolve, reject) => {
    logger.debug(`contentful.fetchSingleEntry:${JSON.stringify(query)}`);
    return module.exports.getClient().getEntries(query)
      .then((entries) => {
        const entry = underscore.first(entries.items);
        if (!entry) {
          const queryStr = JSON.stringify(query);
          const error = new NotFoundError(`${ERROR_PREFIX} Entry not found for query ${queryStr}`);
          return reject(error);
        }
        return resolve(entry);
      })
      .catch(error => reject(module.exports.contentfulError(error)));
  });
}

function fetchByResponseReferenceContentfulId(contentfulId) {
  const query = module.exports.getQueryBuilder()
    .custom({
      content_type: 'defaultTopicTrigger',
      'fields.response.sys.id': contentfulId,
    })
    .build();
  logger.debug('fetchByResponseReferenceContentfulId', { query });
  return module.exports.getClient().getEntries(query)
    .then(res => Promise.resolve(res.items))
    .catch(error => Promise.reject(module.exports.contentfulError(error)));
}

/**
 * @param {Object} contentfulEntry
 * @return {String}
 */
function getContentfulIdFromContentfulEntry(contentfulEntry) {
  return contentfulEntry.sys.id;
}

/**
 * @param {Object} contentfulEntry
 * @return {String}
 */
function getContentTypeFromContentfulEntry(contentfulEntry) {
  return contentfulEntry.sys.contentType.sys.id;
}


/**
 * @param {Object} defaultTopicTriggerObject
 * @return {Object} - Contentful entry saved to the response reference field
 */
function getResponseEntryFromDefaultTopicTrigger(defaultTopicTriggerObject) {
  return defaultTopicTriggerObject.fields.response;
}

/**
 * @param {Object} defaultTopicTriggerObject - A defaultTopicTrigger Contentful entry
 * @return {String}
 */
function getTriggerTextFromDefaultTopicTrigger(defaultTopicTriggerObject) {
  return defaultTopicTriggerObject.fields.trigger;
}

/**
 * @param {Object} messageObject - A message Contentful entry
 * @return {String}
 */
function getTextFromMessage(messageObject) {
  return messageObject.fields.text;
}

/**
 * @param {Object} contentfulEntry
 * @param {String} contentTypeName
 * @return {Boolean}
 */
function isContentType(contentfulEntry, contentTypeName) {
  const contentType = module.exports.getContentTypeFromContentfulEntry(contentfulEntry);
  return contentType === contentTypeName;
}

/**
 * @param {Object} contentfulEntry
 * @return {Boolean}
 */
function isDefaultTopicTrigger(contentfulEntry) {
  return module.exports.isContentType(contentfulEntry, 'defaultTopicTrigger');
}

/**
 * @param {Object} contentfulEntry
 * @return {Boolean}
 */
function isMessage(contentfulEntry) {
  return module.exports.isContentType(contentfulEntry, 'message');
}

module.exports = {
  contentfulError,
  createNewClient,
  fetchByContentfulId,
  fetchByResponseReferenceContentfulId,
  fetchDefaultTopicTriggers,
  fetchSingleEntry,
  getCampaignIdFromContentfulEntry,
  getClient,
  getContentfulIdFromContentfulEntry,
  getContentTypeFromContentfulEntry,
  getQueryBuilder,
  getResponseEntryFromDefaultTopicTrigger,
  getTextFromMessage,
  getTriggerTextFromDefaultTopicTrigger,
  isContentType,
  isDefaultTopicTrigger,
  isMessage,
};

/**
 * @return {Promise}
 */
module.exports.fetchBotConfigByCampaignId = function (campaignId) {
  const query = module.exports.getQueryBuilder()
    .contentType('campaign')
    .campaignId(campaignId)
    .build();

  return module.exports.fetchSingleEntry(query);
};

module.exports.fetchKeyword = function (keyword) {
  logger.debug(`contentful.fetchKeyword:${keyword}`);

  const query = module.exports.getQueryBuilder()
    .contentType('keyword')
    .keyword(keyword)
    .build();
  return module.exports.fetchSingleEntry(query);
};

module.exports.fetchKeywords = function fetchKeywords() {
  logger.debug('contentful.fetchKeywords');
  const query = module.exports.getQueryBuilder()
    .contentType('keyword')
    // We store keywords for both Thor and Production as entries, so filter by current environment.
    .environment(process.env.NODE_ENV)
    .build();
  return module.exports.getClient().getEntries(query)
    .then(response => response.items.map(item => module.exports.formatKeywordFromResponse(item)))
    .catch(error => module.exports.contentfulError(error));
};

module.exports.fetchKeywordsForCampaignId = function (campaignId) {
  logger.debug(`contentful.fetchKeywordsForCampaignId:${campaignId}`);

  const query = module.exports.getQueryBuilder()
    .contentType('keyword')
    // We store keywords for both Thor and Production as entries, so filter by current environment.
    .environment(process.env.NODE_ENV)
    .custom({
      'fields.campaign.sys.contentType.sys.id': 'campaign',
      'fields.campaign.fields.campaignId': campaignId,
    })
    .build();
  return module.exports.getClient().getEntries(query)
    .then(response => response.items.map(item => module.exports
      .formatKeywordFromResponse(item, true)))
    .catch(error => module.exports.contentfulError(error));
};


// Utility functions

module.exports.formatKeywordFromResponse = function formatKeywordFromResponse(contentfulKeyword,
  removeCampaignInfo) {
  const entry = contentfulKeyword.fields;
  const keyword = entry.keyword.toUpperCase();

  if (removeCampaignInfo) {
    return keyword;
  }
  return {
    keyword,
    campaign: entry.campaign,
  };
};

/**
 * Returns the Contentful entry saved to the postConfig reference field on given botConfig.
 * @param {object} botConfig
 * @param {object} - Contentful entry set for the botConfig.postConfig reference field.
 */
module.exports.getPostConfigFromBotConfig = function (botConfig) {
  if (botConfig && botConfig.fields) {
    return botConfig.fields.postConfig;
  }
  return null;
};

/**
 * Returns the content type name of the postConfig entry saved for given botConfig.
 * @param {Object} botConfig
 * @return {String}
 */
module.exports.parsePostConfigContentTypeFromBotConfig = function (botConfig) {
  const postConfig = module.exports.getPostConfigFromBotConfig(botConfig);
  return postConfig ? module.exports.getContentTypeFromContentfulEntry(postConfig) : null;
};
