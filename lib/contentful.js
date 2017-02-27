'use strict';

/**
 * Imports.
 */
const contentful = require('contentful');
const helpers = require('./helpers');
const logger = app.locals.logger;
const UnprocessibleEntityError = require('../app/exceptions/UnprocessibleEntityError');

const contentfulCampaignFields = {
  ask_caption: 'askCaptionMessage',
  ask_photo: 'askPhotoMessage',
  ask_quantity: 'askQuantityMessage',
  ask_why_participated: 'askWhyParticipatedMessage',
  campaign_closed: 'campaignClosedMessage',
  invalid_cmd_signedup: 'invalidSignupMenuCommandMessage',
  invalid_cmd_completed: 'invalidCompletedMenuCommandMessage',
  invalid_quantity: 'invalidQuantityMessage',
  member_support: 'memberSupportMessage',
  menu_completed: 'completedMenuMessage',
  menu_signedup_external: 'externalSignupMenuMessage',
  menu_signedup_gambit: 'gambitSignupMenuMessage',
  no_photo_sent: 'invalidPhotoMessage',
  scheduled_relative_to_reportback_date: 'scheduledRelativeToReportbackDateMessage',
  scheduled_relative_to_signup_date: 'scheduledRelativeToSignupDateMessage',
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
    'fields.campaign.sys.contentType.sys.id': 'campaign',
    'fields.campaign.fields.campaignId': campaignId,
  };

  return client.getEntries(query)
    .then((response) => {
      // Remove unnecessary fields.
      const keywords = response.items.map((item) => {
        const entry = item.fields;
        delete entry.campaign;
        delete entry.environment;
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
    const defaultCampaignId = process.env.CONTENTFUL_DEFAULT_CAMPAIGN_ID || 'default';

    return this.fetchMessageForCampaignId(phoenixCampaign.id, msgType)
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
