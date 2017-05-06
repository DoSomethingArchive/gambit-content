'use strict';

/**
 * Imports.
 */
const Zendesk = require('zendesk-node-api');
const logger = require('winston');

let client;

/**
 * createNewClient
 *
 * @return {Object} client - Zendesk client
 */
module.exports.createNewClient = function createNewClient() {
  try {
    client = new Zendesk({
      url: process.env.ZENDESK_URL,
      email: process.env.ZENDESK_EMAIL,
      token: process.env.ZENDESK_API_TOKEN,
    });
  } catch (err) {
    logger.error(err);
  }
  return client;
};

/**
 * getClient - creates and returns a new client if one has not been created.
 *
 * @return {Object} client
 */
module.exports.getClient = function getClient() {
  if (!client) {
    return exports.createNewClient();
  }
  return client;
};
