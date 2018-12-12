'use strict';

/**
 * Imports.
 */
const logger = require('winston');
const newrelic = require('newrelic');
const helpers = require('./helpers/index');

// register helpers
Object.keys(helpers).forEach((helperName) => {
  module.exports[helperName] = helpers[helperName];
});

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
