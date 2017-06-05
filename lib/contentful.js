'use strict';

/**
 * Imports.
 */
const contentful = require('contentful');
const Promise = require('bluebird');
const logger = require('winston');
const underscore = require('underscore');

const helpers = require('./helpers');
const config = require('../config/lib/contentful');
const Builder = require('./contentfulQueryBuilder');
const UnprocessibleEntityError = require('../app/exceptions/UnprocessibleEntityError');

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

module.exports.fetchBroadcast = function (broadcastId) {
  logger.debug(`contentful.fetchBroadcast:${broadcastId}`);

  const query = exports.getQueryBuilder()
    .contentType('broadcast')
    .broadcastId(broadcastId)
    .build();
  return exports.fetchSingleEntry(query);
};

module.exports.fetchCampaign = function (campaignId) {
  logger.debug(`contentful.fetchCampaign:${campaignId}`);

  const query = exports.getQueryBuilder()
    .contentType('campaign')
    .campaignId(campaignId)
    .build();
  return exports.fetchSingleEntry(query);
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

module.exports.fetchCampaignIdsWithKeywords = function () {
  logger.debug('contentful.fetchCampaignsWithKeywords');
  return exports.fetchKeywords()
    .then(keywords => exports.mapCampaignIds(keywords))
    .catch(err => err);
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
 * Returns given msgType value saved for given campaignId.
 */
module.exports.fetchMessageForCampaignId = function (campaignId, msgType) {
  logger.debug(`fetchMessageForCampaignId:${campaignId} msgType:${msgType}`);

  const fieldName = config.campaignFields[msgType];
  if (!fieldName) {
    throw new Error(`Cannot find Contentful field name for msgType:${msgType}`);
  }

  return exports.fetchCampaign(campaignId)
    .then((contentfulCampaign) => {
      if (!contentfulCampaign) {
        logger.debug(`Contentful campaign not found for campaignId:${campaignId}`);
        return null;
      }

      const message = contentfulCampaign.fields[fieldName];
      logger.debug(`campaignId:${campaignId} msgType:${message}`);

      return message;
    })
    .catch(err => err);
};

/**
 * Renders given msgType for given phoenixCampaign. Checks for overrides, or sends default message.
 */
module.exports.renderMessageForPhoenixCampaign = function (phoenixCampaign, msgType) {
  logger.debug(`renderMessageForPhoenixCampaign:${phoenixCampaign.id} msgType:${msgType}`);

  return new Promise((resolve, reject) => {
    this.fetchMessageForCampaignId(phoenixCampaign.id, msgType)
      .then((message) => {
        if (message) {
          return message;
        }

        return this.fetchMessageForCampaignId(defaultCampaignId, msgType);
      })
      .then((message) => {
        if (!message) {
          const errorMsg = `Contentful msgType:${msgType} is not defined for default Campaign.`;
          const err = new UnprocessibleEntityError(errorMsg);

          return reject(err);
        }

        return helpers.replacePhoenixCampaignVars(message, phoenixCampaign);
      })
      .then(renderedMessage => resolve(renderedMessage))
      .catch(err => reject(err));
  });
};


/**
 * Gets all fields for the campaign together with the default fields in the default campaign.
 *
 * @param  {type} campaignId
 * @return {Promise}
 */
module.exports.getAllFieldsForCampaign = function getAllFieldsForCampaign(campaignId) {
  return new Promise((resolve, reject) => {
    const campaignFieldNames = Object.keys(config.campaignFields);
    const campaignContent = {};
    const campaignFields = {};
    return exports.fetchCampaign(campaignId)
      .then((contentfulCampaign) => {
        campaignContent.overrides = contentfulCampaign.fields;
        return exports.fetchCampaign(defaultCampaignId);
      })
      .then((defaultContentfulCampaign) => {
        campaignContent.defaults = defaultContentfulCampaign.fields;
        campaignFieldNames.forEach((key) => {
          const fieldName = config.campaignFields[key];
          campaignFields[fieldName] = {};

          if (campaignContent.overrides[fieldName]) {
            campaignFields[fieldName].override = true;
            campaignFields[fieldName].raw = campaignContent.overrides[fieldName];
          } else {
            campaignFields[fieldName].override = false;
            campaignFields[fieldName].raw = campaignContent.defaults[fieldName];
          }
        });
        return resolve(campaignFields);
      })
      .catch(err => reject(err));
  });
};

/**
 * Returns all rendered messages for given phoenixCampaign, using defaults when no override defined.
 */
module.exports.renderAllMessagesForPhoenixCampaign = function (phoenixCampaign) {
  logger.debug(`renderAllMessagesForPhoenixCampaign:${phoenixCampaign.id}`);
  return new Promise((resolve, reject) =>
    // get all fields, overrides and default
    exports.getAllFieldsForCampaign(phoenixCampaign.id)
      .then(campaignFields => Promise.map(
          /**
           * Iterator
           */
          Object.keys(campaignFields),
          /**
           * Mapper fn: calls helpers.replacePhoenixCampaignVars for each campaign field raw message
           * NOTE Disabling arrow-body-style because we need to create a function scope to
           * remember `fieldName`. Disabling max-len for better readability
           */
          (fieldName) => { // eslint-disable-line arrow-body-style
            return helpers.replacePhoenixCampaignVars(campaignFields[fieldName].raw, phoenixCampaign) // eslint-disable-line max-len
              /**
               * Let's add the rendered message to the campaignFields object under the rendered prop
               */
              .then((msg) => {
                campaignFields[fieldName].rendered = msg; // eslint-disable-line no-param-reassign
              });
          })
        /**
         * When all promises have been fulfilled, we resolve our Promise with the campaignFields
         * rendered
         */
        .then(() => {
          resolve(campaignFields);
        })
        .catch(err => reject(err)))
      .catch(err => reject(err)));
};

// Utility functions

module.exports.formatKeywordFromResponse = function formatKeywordFromResponse(keyword,
  removeCampaignInfo) {
  const entry = keyword.fields;
  delete entry.environment;

  if (removeCampaignInfo) {
    delete entry.campaign;
  }
  // Note: We return each keyword as an object, because we eventually plan to add more fields
  // to a keyword, e.g. a different greeting to send when a specific keyword is sent.
  entry.keyword = entry.keyword.toUpperCase();
  return entry;
};

module.exports.mapCampaignIds = function mapCampaignIds(keywords = []) {
  const campaignMap = {};
  const filteredKeywords = keywords.filter(
    keyword => (keyword && keyword.campaign.fields && keyword.campaign.fields.campaignId));

  filteredKeywords.forEach((keyword) => {
    const campaignId = keyword.campaign.fields.campaignId;
    if (!campaignMap[campaignId]) {
      campaignMap[campaignId] = true;
    }
  });
  return Object.keys(campaignMap);
};
