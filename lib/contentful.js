'use strict';

/**
 * Imports.
 */
const contentful = require('contentful');
const Promise = require('bluebird');
const logger = require('winston');

const helpers = require('./helpers');
const UnprocessibleEntityError = require('../app/exceptions/UnprocessibleEntityError');

const defaultCampaignId = process.env.CONTENTFUL_DEFAULT_CAMPAIGN_ID || 'default';

// The sequence we define peroperties here determines the order they appear in GET Gambit Campaigns
// API response. Should match the sequence defined in Contentful, which is based on the order in
// which our end user will see the messages.
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

/**
 * Setup.
 */
let client;
try {
  client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });
} catch (err) {
  // TODO: Log this. Send to Stathat, but alert developers that we're in trouble.
  // @see https://github.com/DoSomething/gambit/issues/714#issuecomment-259838498
  logger.error(`contentful error:${err.message}`);
}

/**
 * Prefixes Contentful identifier to given error.message.
 */
function contentfulError(error) {
  const scope = error;
  scope.message = `Contentful: ${error.message}`;

  return scope;
}

/**
 * Returns first result of a Contentful getEntries call for the given query.
 */
function fetchSingleEntry(query) {
  return new Promise((resolve, reject) => {
    logger.debug(`contentful.fetchSingleEntry:${JSON.stringify(query)}`);
    return client.getEntries(query)
    .then((entries) => {
      if (entries.items.length === 0) {
        return resolve(false);
      }

      return resolve(entries.items[0]);
    })
    .catch(error => reject(contentfulError(error)));
  });
}

module.exports.fetchBroadcast = function (broadcastId) {
  logger.debug(`contentful.fetchBroadcast:${broadcastId}`);

  return fetchSingleEntry({
    content_type: 'broadcast',
    'fields.broadcastId': broadcastId,
  });
};

module.exports.fetchCampaign = function (campaignId) {
  logger.debug(`contentful.fetchCampaign:${campaignId}`);

  return fetchSingleEntry({
    content_type: 'campaign',
    'fields.campaignId': campaignId,
  });
};

module.exports.fetchCampaignIdsWithKeywords = function () {
  logger.debug('contentful.fetchCampaignsWithKeywords');
  const campaignMap = {};

  return this.fetchKeywordsForCampaignId()
    .then((keywords) => {
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

  return fetchSingleEntry({
    content_type: 'keyword',
    'fields.keyword': keyword,
  });
};

module.exports.fetchKeywordsForCampaignId = function (campaignId) {
  logger.debug(`contentful.fetchKeywordsForCampaignId:${campaignId}`);
  const query = {
    content_type: 'keyword',
    // We store keywords for both Thor and Production as entries, so filter by current environment.
    'fields.environment': process.env.NODE_ENV,
  };
  if (campaignId) {
    query['fields.campaign.sys.contentType.sys.id'] = 'campaign';
    query['fields.campaign.fields.campaignId'] = campaignId;
  }

  return client.getEntries(query)
    .then((response) => {
      // Remove unnecessary fields.
      const keywords = response.items.map((item) => {
        const entry = item.fields;
        delete entry.environment;
        if (campaignId) {
          delete entry.campaign;
        }
        // Note: We return each keyword as an object, because we eventually plan to add more fields
        // to a keyword, e.g. a different greeting to send when a specific keyword is sent.
        entry.keyword = entry.keyword.toUpperCase();

        return entry;
      });

      return keywords;
    })
    .catch(error => contentfulError(error));
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

  return this.fetchCampaign(campaignId)
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

    return this.fetchCampaign(phoenixCampaign.id)
      .then((contentfulCampaign) => {
        campaignContent.overrides = contentfulCampaign.fields;

        return this.fetchCampaign(defaultCampaignId);
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
