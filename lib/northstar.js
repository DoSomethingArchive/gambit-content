'use strict';

/**
 * Imports.
 */
const NorthstarClient = require('@dosomething/northstar-js');
const logger = app.locals.logger;

/**
 * Setup.
 */
let client;
try {
  client = new NorthstarClient({
    baseURI: process.env.DS_NORTHSTAR_API_BASEURI,
    apiKey: process.env.DS_NORTHSTAR_API_KEY,
  });
} catch (err) {
  logger.error(`northstar error:${err.message}`);
}

module.exports = client;
