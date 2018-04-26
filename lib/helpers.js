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
 * addBlinkSuppressHeaders
 *
 * @param  {object} res The response object
 * @return {object}     Response
 */
module.exports.addBlinkSuppressHeaders = function addBlinkSuppressHeaders(res) {
  newrelic.addCustomParameters({ blinkSuppressRetry: true });
  return res.setHeader('x-blink-retry-suppress', true);
};

/**
 * @param {string} message
 * @return {string}
 */
module.exports.getFirstWord = function (message) {
  if (!message) {
    return null;
  }
  const trimmed = message.trim();
  if (trimmed.indexOf(' ') >= 0) {
    return trimmed.substr(0, trimmed.indexOf(' '));
  }

  return trimmed;
};

/**
 * Replaces mustache tags used in raw Campaign Template strings with given variables.
 * @param {string} input
 * @param {object} phoenixCampaign
 * @return string.
 */
module.exports.replacePhoenixCampaignVars = function (input, phoenixCampaign) {
  if (!input) {
    return '';
  }

  let scope = input;
  scope = scope.replace(/{{title}}/gi, phoenixCampaign.title);
  scope = scope.replace(/{{tagline}}/i, phoenixCampaign.tagline);
  // TODO: Get tags to search for from helpers.command instead of hardcoding here.
  // This whole function should be refactored and moved into the helpers.campaign.
  scope = scope.replace(/{{cmd_reportback}}/i, helpers.command.getStartCommand());
  scope = scope.replace(/{{cmd_member_support}}/i, helpers.command.getRequestSupportCommand());
  if (phoenixCampaign.keywords) {
    scope = scope.replace(/{{keyword}}/gi, phoenixCampaign.keywords[0]);
  }
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

/**
 * Sends response with the request Signup and the template to reply with.
 * @param {object} res - Express response
 * @param {Signup} signup
 * @param {string} replyTemplate
 */
module.exports.sendResponseForSignup = function (res, signup, replyTemplate) {
  const data = { replyTemplate };
  let signupId = null;
  if (signup) {
    data.signup = signup.formatForApi();
    signupId = data.signup.id;
  } else {
    data.signup = null;
  }
  logger.info('helpers.sendResponseForSignup', { signupId, replyTemplate });
  logger.verbose('helpers.sendResponseForSignup', { data });

  return res.send({ data });
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

/**
 * Returns object of options to pass to mongoose.findOneAndUpdate to upsert a document.
 */
module.exports.upsertOptions = function () {
  const options = {
    upsert: true,
    new: true,
  };

  return options;
};

/**
 * Determines if given incomingMessage matches given Gambit command type.
 */
module.exports.isCommand = function isCommand(incomingMessage, commandType) {
  logger.debug(`isCommand:${commandType}`);

  if (!incomingMessage) {
    return false;
  }

  const firstWord = this.getFirstWord(incomingMessage).toUpperCase();
  const configName = `GAMBIT_CMD_${commandType.toUpperCase()}`;
  const configValue = process.env[configName];
  const result = firstWord === configValue.toUpperCase();

  return result;
};
