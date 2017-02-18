'use strict';

/**
 * Imports.
 */
const contentful = require('contentful');
const helpers = require('./helpers');
const logger = app.locals.logger;

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
    'fields.campaign.sys.contentType.sys.id': 'campaign',
    'fields.campaign.fields.campaignId': campaignId,
  };

  return client.getEntries(query)
    .then((response) => {
      // We store keywords for both Thor and Production in our Keywords content type.
      // Filter the results based on our Node environment:
      const filteredItems = response.items.filter((item) => {
        if (!item.fields) {
          return false;
        }
        if (item.fields.environment !== process.env.NODE_ENV) {
          logger.debug(`filtering ${process.env.NODE_ENV} keyword:${item.fields.keyword}`);
          return false;
        }
        return true;
      });
      // Remove unnecessary fields.
      const keywords = filteredItems.map((item) => {
        const entry = item.fields;
        delete entry.campaign;
        delete entry.environment;

        entry.keyword = entry.keyword.toUpperCase();
        return entry;
      });

      return keywords;
    })
    .catch(error => contentfulError(error));
};

module.exports.fetchMessageForPhoenixCampaign = function (phoenixCampaign, msgType) {
  let fieldName = msgType;
  // Values sent by Quicksilver:
  if (msgType === 'scheduled_relative_to_signup_date') {
    fieldName = 'scheduledRelativeToSignupDateMessage';
  } else if (msgType === 'scheduled_relative_to_reportback_date') {
    fieldName = 'scheduledRelativeToReportbackDateMessage';
  }

  return new Promise((resolve, reject) => {
    const defaultCampaignId = 'default';
    let message;

    // TODO: First check if we have an override defined on the entry for our phoenixCampaign.id
    return this.fetchCampaign(defaultCampaignId)
      .then((contentfulCampaign) => {
        logger.debug(`found contentfulCampaign:${defaultCampaignId}`);

        message = contentfulCampaign.fields[fieldName];
        message = helpers.replacePhoenixCampaignVars(message, phoenixCampaign);

        return resolve(message);
      })
      .catch(err => reject(err));
  });
};
