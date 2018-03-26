'use strict';

/**
 * Imports.
 */
const contentful = require('contentful');
const Promise = require('bluebird');
const logger = require('winston');
const underscore = require('underscore');

const config = require('../config/lib/contentful');
const Builder = require('./contentfulQueryBuilder');

const defaultCampaignId = config.defaultCampaignId;
const ERROR_PREFIX = 'Contentful:';

/**
 * Gets an instance of the contentful query builder
 *
 * @return {QueryBuilder}
 */
module.exports.getQueryBuilder = function getQueryBuilder() {
  return new Builder();
};

/**
 * Setup.
 */
let client;

/**
 * createNewClient
 *
 * @return {Object}  client - Contentful client
 */
module.exports.createNewClient = function createNewClient() {
  try {
    client = contentful.createClient(config.clientOptions);
  } catch (err) {
    // TODO: Log this. Send to Stathat, but alert developers that we're in trouble.
    // @see https://github.com/DoSomething/gambit/issues/714#issuecomment-259838498
    logger.error(exports.contentfulError(err));
  }
  return client;
};

/**
 * getClient - creates and returns a new client if one has not been created.
 *
 * @return {Object}  client
 */
module.exports.getClient = function getClient() {
  if (!client) {
    return exports.createNewClient();
  }
  return client;
};

/**
 * Prefixes Contentful identifier to given error.message.
 */
module.exports.contentfulError = function contentfulError(error) {
  const scope = error;
  scope.message = `${ERROR_PREFIX} ${error.message}`;
  return scope;
};

/**
 * Returns first result of a Contentful getEntries call for the given query.
 */
module.exports.fetchSingleEntry = function fetchSingleEntry(query) {
  return new Promise((resolve, reject) => {
    logger.debug(`contentful.fetchSingleEntry:${JSON.stringify(query)}`);
    return exports.getClient().getEntries(query)
    .then(entries => resolve(underscore.first(entries.items)))
    .catch(error => reject(exports.contentfulError(error)));
  });
};

/**
 * Fetches a list of Contentful Campaigns by given array of campaignId field values
 * Although Phoenix Campaign ID's are numeric, the Contentful campaignId is a string.
 * @param {array} campaignIds
 */
module.exports.fetchCampaigns = function (campaignIds) {
  const query = exports.getQueryBuilder()
    .contentType('campaign')
    .campaignIds(campaignIds)
    .build();

  return exports.getClient().getEntries(query);
};

module.exports.fetchKeyword = function (keyword) {
  logger.debug(`contentful.fetchKeyword:${keyword}`);

  const query = exports.getQueryBuilder()
    .contentType('keyword')
    .keyword(keyword)
    .build();
  return exports.fetchSingleEntry(query);
};

module.exports.fetchKeywords = function fetchKeywords() {
  logger.debug('contentful.fetchKeywords');
  const query = exports.getQueryBuilder()
    .contentType('keyword')
    // We store keywords for both Thor and Production as entries, so filter by current environment.
    .environment(process.env.NODE_ENV)
    .build();
  return exports.getClient().getEntries(query)
  .then(response => response.items.map(item => exports.formatKeywordFromResponse(item)))
  .catch(error => exports.contentfulError(error));
};

module.exports.fetchKeywordsForCampaignId = function (campaignId) {
  logger.debug(`contentful.fetchKeywordsForCampaignId:${campaignId}`);

  const query = exports.getQueryBuilder()
    .contentType('keyword')
    // We store keywords for both Thor and Production as entries, so filter by current environment.
    .environment(process.env.NODE_ENV)
    .custom({
      'fields.campaign.sys.contentType.sys.id': 'campaign',
      'fields.campaign.fields.campaignId': campaignId,
    })
    .build();
  return exports.getClient().getEntries(query)
    .then(response => response.items.map(item => exports.formatKeywordFromResponse(item, true)))
    .catch(error => exports.contentfulError(error));
};

/**
 * @return {object}
 */
module.exports.getContentfulCampaignFieldsByTemplateName = function () {
  return config.campaignFields;
};

/**
 * @param {array} entries - Array of Contentful Campaign entries.
 * @return {object}
 */
module.exports.parseDefaultAndOverrideCampaignsResponse = function (entries) {
  if (entries.length === 0) {
    return {};
  }
  if (entries.length === 1) {
    return { default: entries[0] };
  }
  if (entries[0].fields.campaignId === defaultCampaignId) {
    return {
      default: entries[0],
      override: entries[1],
    };
  }
  return {
    default: entries[1],
    override: entries[0],
  };
};

/**
 * @param {number} campaignId
 * @return {Promise}
 */
module.exports.fetchDefaultAndOverrideContentfulCampaignsForCampaignId = function (campaignId) {
  return new Promise((resolve, reject) => {
    logger.debug(`contentful.fetchContentulCampaignsForPhoenixCampaignId:${campaignId}`);
    const campaignIds = [defaultCampaignId, campaignId];

    return exports.fetchCampaigns(campaignIds)
      .then((res) => {
        const data = exports.parseDefaultAndOverrideCampaignsResponse(res.items);
        return resolve(data);
      })
      .catch(error => reject(exports.contentfulError(error)));
  });
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

module.exports.getFieldNameForCampaignMessageTemplate = function (messageTemplate) {
  return config.campaignFields[messageTemplate];
};
