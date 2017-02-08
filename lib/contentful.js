'use strict';

/**
 * Imports.
 */
const contentful = require('contentful');
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
      const entry = entries.items[0];

      return resolve(entry.fields);
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
    'fields.campaignId': campaignId,
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
        delete entry.campaignId;
        delete entry.environment;

        entry.keyword = entry.keyword.toUpperCase();
        return entry;
      });

      return keywords;
    })
    .catch(error => contentfulError(error));
};
