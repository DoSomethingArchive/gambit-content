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
 * Returns the fields defined on the Broadcast content type for a given broadcastId.
 */
module.exports.fetchBroadcast = function (broadcastId) {
  return new Promise((resolve, reject) => {
    logger.debug(`fetchBroadcast:${broadcastId}`);
    return client.getEntries({
      content_type: 'broadcast',
      'fields.broadcastId': broadcastId,
    })
    .then((entries) => {
      if (entries.items.length === 0) {
        return resolve(false);
      }
      const broadcast = entries.items[0];

      return resolve(broadcast.fields);
    })
    .catch(error => reject(error));
  });
};
