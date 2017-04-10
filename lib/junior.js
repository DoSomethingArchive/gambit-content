'use strict';

/**
 * Imports.
 */
const superagent = require('superagent');
const logger = require('winston');

/**
 * Setup.
 */
const defaultUri = 'http://dev-gambit-jr.pantheonsite.io/wp-json/wp/v2';
const uri = process.env.GAMBIT_JR_API_BASEURI || defaultUri;

/**
 * Helper function to parse a Gambit Jr. bot.
 */
function parseBot(data) {
  if (!data.id) {
    throw new Error('Cannot parse bot.');
  }
  logger.debug(`parseBot id:${data.id}`);

  return data;
}

/**
 * Helper function to parse response body to given endpoint bot.
 */
function parseGet(response, endpoint) {
  logger.debug(`parseGet endpoint:${endpoint}`);
  if (!response.body) {
    throw new Error('Cannot parse API get response.');
  }

  return parseBot(response.body);
}

/**
 * Helper function to parse response body to an array of given endpoint bots.
 */
function parseIndex(response, endpoint) {
  logger(`parseIndex ${endpoint}`);

  if (!response.body.length) {
    throw new Error('Cannot parse API index response.');
  }

  return response.body.map(row => parseBot(row));
}

/**
 * Returns GET gambit-jr/endpoint/:id.
 */
module.exports.get = function (endpoint, id) {
  return superagent
    .get(`${uri}/${endpoint}/${id}`)
    .then(response => parseGet(response, endpoint))
    .catch(err => logger.error(err.message));
};

/**
 * Returns GET gambit-jr/endpoint.
 */
module.exports.index = function (endpoint) {
  return superagent
    .get(`${uri}/${endpoint}`)
    .then(response => parseIndex(response, endpoint))
    .catch(err => logger.error(err.message));
};
