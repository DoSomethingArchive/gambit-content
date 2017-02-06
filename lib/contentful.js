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
    .catch(error => reject(error));
  });
}

module.exports.fetchBroadcast = function (broadcastId) {
  logger.debug(`fetchBroadcast:${broadcastId}`);

  return fetchSingleEntry({
    content_type: 'broadcast',
    'fields.broadcastId': broadcastId,
  });
};
