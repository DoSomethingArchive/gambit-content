'use strict';

/**
 * Imports.
 */
const superagent = require('superagent');
const logger = rootRequire('lib/logger');

/**
 * Setup.
 */
const defaultUri = 'http://dev-gambit-jr.pantheonsite.io/wp-json/wp/v2';
const uri = process.env.GAMBIT_JR_API_BASEURI || defaultUri;
const models = {
  campaignbots: [
    'id',
    'msg_ask_caption',
    'msg_ask_photo',
    'msg_ask_quantity',
    'msg_ask_why_participated',
    'msg_invalid_cmd_completed',
    'msg_invalid_cmd_signedup',
    'msg_invalid_quantity',
    'msg_member_support',
    'msg_menu_completed',
    'msg_menu_signedup',
    'msg_no_photo_sent',
  ],
  donorschoosebots: [
    'id',
    'msg_ask_email',
    'msg_ask_first_name',
    'msg_ask_zip',
    'msg_donation_success',
    'msg_error_generic',
    'msg_invalid_email',
    'msg_invalid_first_name',
    'msg_invalid_zip',
    'msg_project_link',
    'msg_max_donations_reached',
    'msg_search_start',
    'msg_search_no_results',
  ],
};

/**
 * Helper function to parse data object to given endpoint bot.
 */
function parseBot(data, endpoint) {
  logger.verbose(`parseBot endpoint:${endpoint} id:${data.id}`);

  const bot = {};
  models[endpoint].forEach((property) => {
    bot[property] = data[property];
  });

  return bot;
}

/**
 * Helper function to parse response body to given endpoint bot.
 */
function parseGet(response, endpoint) {
  logger.verbose(`parseGet endpoint:${endpoint}`);
  if (!response.body) {
    throw new Error('Cannot parse API get response.');
  }

  return parseBot(response.body, endpoint);
}

/**
 * Helper function to parse response body to an array of given endpoint bots.
 */
function parseIndex(response, endpoint) {
  logger.debug(`parseIndex ${endpoint}`);

  if (!response.body.length) {
    throw new Error('Cannot parse API index response.');
  }

  return response.body.map(row => parseBot(row, endpoint));
}

/**
 * Returns GET gambit-jr/endpoint/:id.
 */
module.exports.get = function (endpoint, id) {
  return superagent
    .get(`${uri}/${endpoint}/${id}`)
    .then(response => parseGet(response, endpoint));
};

/**
 * Returns GET gambit-jr/endpoint.
 */
module.exports.index = function (endpoint) {
  return superagent
    .get(`${uri}/${endpoint}`)
    .then(response => parseIndex(response, endpoint));
};
