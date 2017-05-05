'use strict';

/**
 * Imports.
 */
const contentful = require('contentful');
const Promise = require('bluebird');
const logger = require('winston');
const config = require('../config/contentful');
const helpers = require('./helpers');
const UnprocessibleEntityError = require('../app/exceptions/UnprocessibleEntityError');
const Builder = require('./contentfulQueryBuilder');

const defaultCampaignId = config.defaultCampaignId;
const ERROR_PREFIX = 'Contentful:';

// The sequence we define peroperties here determines the order they appear in GET Gambit Campaigns
// API response. Should match the sequence defined in Contentful, which is based on the order in
// which our end user will see the messages.
// TODO: Javascript Objects do not guarantee order,
// we should change this to an array if order is important.
const contentfulCampaignFields = {
  menu_signedup_gambit: 'gambitSignupMenuMessage',
  menu_signedup_external: 'externalSignupMenuMessage',
  invalid_cmd_signedup: 'invalidSignupMenuCommandMessage',
  ask_quantity: 'askQuantityMessage',
  invalid_quantity: 'invalidQuantityMessage',
  ask_photo: 'askPhotoMessage',
  no_photo_sent: 'invalidPhotoMessage',
  ask_caption: 'askCaptionMessage',
  ask_why_participated: 'askWhyParticipatedMessage',
  menu_completed: 'completedMenuMessage',
  invalid_cmd_completed: 'invalidCompletedMenuCommandMessage',
  scheduled_relative_to_signup_date: 'scheduledRelativeToSignupDateMessage',
  scheduled_relative_to_reportback_date: 'scheduledRelativeToReportbackDateMessage',
  member_support: 'memberSupportMessage',
  campaign_closed: 'campaignClosedMessage',
};

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

module.exports.getFirstItemFromArray = function getFirstItemFromArray(array) {
  if (array.length === 0) {
    return false;
  }
  return array[0];
};

/**
 * Returns first result of a Contentful getEntries call for the given query.
 */
module.exports.fetchSingleEntry = function fetchSingleEntry(query) {
  return new Promise((resolve, reject) => {
    logger.debug(`contentful.fetchSingleEntry:${JSON.stringify(query)}`);
    return exports.getClient().getEntries(query)
    .then(entries => resolve(exports.getFirstItemFromArray(entries.items)))
    .catch(error => reject(exports.contentfulError(error)));
  });
};

module.exports.fetchBroadcast = function (broadcastId) {
  logger.debug(`contentful.fetchBroadcast:${broadcastId}`);

  const query = exports.getQueryBuilder()
    .type('broadcast')
    .broadcast(broadcastId)
    .build();
  return exports.fetchSingleEntry(query);
};

module.exports.fetchCampaign = function (campaignId) {
  logger.debug(`contentful.fetchCampaign:${campaignId}`);

  const query = exports.getQueryBuilder()
    .type('campaign')
    .campaign(campaignId)
    .build();
  return exports.fetchSingleEntry(query);
};

module.exports.fetchCampaignIdsWithKeywords = function () {
  logger.debug('contentful.fetchCampaignsWithKeywords');
  const campaignMap = {};

  return exports.fetchKeywords()
    .then((keywords) => {
      // TODO: Refactor and use a formatter function
      keywords.forEach((keyword) => {
        if (!keyword || !keyword.campaign.fields) {
          return;
        }
        const campaignId = keyword.campaign.fields.campaignId;
        if (!campaignId) {
          return;
        }
        if (!campaignMap[campaignId]) {
          campaignMap[campaignId] = true;
        }
      });

      return Object.keys(campaignMap);
    })
    .catch(err => err);
};

module.exports.fetchKeyword = function (keyword) {
  logger.debug(`contentful.fetchKeyword:${keyword}`);

  const query = exports.getQueryBuilder()
    .type('keyword')
    .keyword(keyword)
    .build();
  return exports.fetchSingleEntry(query);
};

module.exports.fetchKeywords = function fetchKeywords() {
  logger.debug('contentful.fetchKeywords');
  const query = exports.getQueryBuilder()
    .type('keyword')
    // We store keywords for both Thor and Production as entries, so filter by current environment.
    .env(process.env.NODE_ENV)
    .build();
  return exports.getClient().getEntries(query)
  .then(response => response.items.map(item => exports.formatKeywordFromResponse(item)))
  .catch(error => exports.contentfulError(error));
};

module.exports.fetchKeywordsForCampaignId = function (campaignId) {
  logger.debug(`contentful.fetchKeywordsForCampaignId:${campaignId}`);

  const query = exports.getQueryBuilder()
    .type('keyword')
    // We store keywords for both Thor and Production as entries, so filter by current environment.
    .env(process.env.NODE_ENV)
    .custom({
      'fields.campaign.sys.contentType.sys.id': 'campaign',
      'fields.campaign.fields.campaignId': campaignId,
    })
    .build();
  return exports.getClient().getEntries(query)
    .then(response => response.items.map(item => exports.formatKeywordFromResponse(item, true)))
    .catch(error => exports.contentfulError(error));
};

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

/**
 * Returns given msgType value saved for given campaignId.
 */
module.exports.fetchMessageForCampaignId = function (campaignId, msgType) {
  logger.debug(`fetchMessageForCampaignId:${campaignId} msgType:${msgType}`);

  const fieldName = contentfulCampaignFields[msgType];
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
 * Returns all rendered messages for given phoenixCampaign, using defaults when no override defined.
 */
module.exports.renderAllMessagesForPhoenixCampaign = function (phoenixCampaign) {
  logger.debug(`renderAllMessagesForPhoenixCampaign:${phoenixCampaign.id}`);

  return new Promise((resolve, reject) => {
    const campaignFieldNames = Object.keys(contentfulCampaignFields);
    const campaignContent = {};
    const result = {};

    return exports.fetchCampaign(phoenixCampaign.id)
      .then((contentfulCampaign) => {
        campaignContent.overrides = contentfulCampaign.fields;

        return exports.fetchCampaign(defaultCampaignId);
      })
      .then((defaultContentfulCampaign) => {
        campaignContent.defaults = defaultContentfulCampaign.fields;
        const promises = [];

        campaignFieldNames.forEach((key) => {
          const fieldName = contentfulCampaignFields[key];
          result[fieldName] = {};

          if (campaignContent.overrides[fieldName]) {
            result[fieldName].override = true;
            result[fieldName].raw = campaignContent.overrides[fieldName];
          } else {
            result[fieldName].override = false;
            result[fieldName].raw = campaignContent.defaults[fieldName];
          }

          promises.push(helpers.replacePhoenixCampaignVars(result[fieldName].raw, phoenixCampaign));
        });

        return Promise.all(promises);
      })
      .then((renderedMessages) => {
        // The order of renderedMessages corresponds to the sequence we defined campaignFieldNames.
        renderedMessages.forEach((renderedMessage, index) => {
          // Store the machine name used in code (e.g. 'ask_caption').
          const key = campaignFieldNames[index];
          // Find the Contentful field name that corresponds to the machine name.
          const fieldName = contentfulCampaignFields[key];

          if (result[fieldName]) {
            result[fieldName].rendered = renderedMessage;
          }
        });

        return resolve(result);
      })
      .catch(err => reject(err));
  });
};
