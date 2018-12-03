'use strict';

/**
 * Imports.
 */
const logger = require('winston');
const newrelic = require('newrelic');
const stathat = require('./stathat');
const helpers = require('./helpers/index');

// register helpers
Object.keys(helpers).forEach((helperName) => {
  module.exports[helperName] = helpers[helperName];
});

/**
 * Replaces mustache tags used in raw Campaign Template strings with given variables.
 * @param {string} input
 * @param {object} campaign
 * @return string.
 */
module.exports.replacePhoenixCampaignVars = function (input, campaign) {
  if (!input) {
    return '';
  }

  let scope = input;
  if (campaign) {
    scope = scope.replace(/{{title}}/gi, campaign.title);
    scope = scope.replace(/{{tagline}}/i, campaign.tagline);
  }

  // TODO: Get tags to search for from helpers.command instead of hardcoding here.
  // This whole function should be refactored with Mustache and moved into the topic helper.
  scope = scope.replace(/{{cmd_reportback}}/i, helpers.command.getStartCommand());
  scope = scope.replace(/{{cmd_member_support}}/i, helpers.command.getRequestSupportCommand());

  return scope;
};

/**
 * Formats given Express response and sends an object including given message, with given code.
 * @param {object} res - Express response
 * @param {number} code - HTTP status code to return
 * @param {string} messageText
 */
module.exports.sendResponse = function (res, code, messageText) {
  let type = 'success';
  if (code > 200) {
    type = 'error';
    logger.error(messageText);
    stathat.postStat(`${code}: ${messageText}`);
  }

  const response = {};
  response[type] = {
    code,
    message: messageText,
  };
  logger.verbose(response);

  return res.status(code).send(response);
};

module.exports.handleTimeout = function handleTimeout(req, res) {
  const timedout = req.timedout;
  if (timedout) {
    return module.exports.sendTimeoutResponse(res);
  }
  return timedout;
};

/**
 * Sends response object for a Gambit timeout.
 * @param {object} res - Express response
 */
module.exports.sendTimeoutResponse = function (res) {
  return this.sendResponse(res, 504, `Request timed out after ${res.timeoutNumSeconds} seconds.`);
};

module.exports.sendErrorResponse = function (res, err) {
  let status = err.status;
  if (!status) {
    status = 500;
  }
  newrelic.addCustomParameters({ gambitErrorMessage: err.message });

  return this.sendResponse(res, status, err.message);
};

/**
 * Sends a 422 with given message.
 * @param {object} res - Express response
 * @param {object} message - Express response
 */
module.exports.sendUnproccessibleEntityResponse = function (res, message) {
  return this.sendResponse(res, 422, message);
};
