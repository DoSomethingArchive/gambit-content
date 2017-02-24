'use strict';

/**
 * Imports.
 */
const PhoenixClient = require('@dosomething/phoenix-js');
const logger = app.locals.logger;

/**
 * Setup.
 */
let client;
try {
  client = new PhoenixClient({
    baseURI: process.env.DS_PHOENIX_API_BASEURI,
    username: process.env.DS_PHOENIX_API_USERNAME,
    password: process.env.DS_PHOENIX_API_PASSWORD,
  });
} catch (err) {
  logger.error(`phoenix error:${err.message}`);
}

module.exports.client = client;

module.exports.isClosedCampaign = function (phoenixCampaign) {
  return (phoenixCampaign.status === 'closed');
};
