'use strict';

/**
 * Imports.
 */
const contentful = require('contentful');
const logger = app.locals.logger;

/**
 * Setup.
 */
const spaceId = process.env.CONTENTFUL_SPACE_ID;
const accessToken = process.env.CONTENTFUL_ACCESS_TOKEN;
const client = contentful.createClient({
  space: spaceId,
  accessToken,
});

module.exports.fetchBroadcast = function (broadcastId) {
  logger.debug(`fetchBroadcast:${broadcastId}`);

  return client.getEntries({
    content_type: 'broadcast',
    'fields.broadcastId': broadcastId,
  })
  .then((entries) => {
    if (entries.items.length === 0) {
      return false;
    }
    const broadcast = entries.items[0];

    return broadcast.fields;
  });
};
