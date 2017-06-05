'use strict';

/**
 * Imports.
 */
const crypto = require('crypto');
const logger = require('winston');
const newrelic = require('newrelic');
const contentful = require('./contentful');
const stathat = require('./stathat');

/**
 * Prepends the Sender Prefix config variable if it exists.
 */
module.exports.addSenderPrefix = function (string) {
  const senderPrefix = process.env.GAMBIT_CHATBOT_RESPONSE_PREFIX;
  if (!senderPrefix) {
    return string;
  }

  return `${senderPrefix} ${string}`;
};

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

module.exports.isYesResponse = function (message) {
  const trimmedMsg = message.toLowerCase().trim();
  const yesResponses = process.env.GAMBIT_YES_RESPONSES ?
    process.env.GAMBIT_YES_RESPONSES.toLowerCase().split(',') : ['yes'];

  const matchRegex = new RegExp(`^(${yesResponses.join('|')})$`);

  return !!trimmedMsg.match(matchRegex);
};

module.exports.hasLetters = function (message) {
  return RegExp(/[a-zA-Z]/g).test(message);
};

/**
 * Checks if given input string contains a valid Reportback quantity.
 * @param {string} input
 * @return {boolean}
 */
module.exports.isValidReportbackQuantity = function (input) {
  // TODO: Make this much better!
  // @see https://github.com/DoSomething/gambit/issues/608
  return (Number(input) && !this.hasLetters(input));
};

/**
 * Checks if given input string contains a valid Reportback text field.
 * @param {string} input
 * @return {boolean}
 */
module.exports.isValidReportbackText = function (input) {
  return !!(input && input.trim().length > 3 && this.hasLetters(input));
};

module.exports.generatePassword = function (text) {
  return crypto.createHmac('sha1', process.env.DS_API_PASSWORD_KEY)
    .update(text)
    .digest('hex')
    .substring(0, 6);
};

/**
 * Replaces given input string with variables from given phoenixCampaign and signupKeyword.
 */
module.exports.replacePhoenixCampaignVars = function (input, phoenixCampaign, signupKeyword) {
  return new Promise((resolve, reject) => {
    logger.debug(`helpers.replacePhoenixCampaignVars campaignId:${phoenixCampaign.id}`);
    if (!input) {
      return resolve('');
    }

    let scope = input;

    try {
      scope = scope.replace(/{{title}}/gi, phoenixCampaign.title);
      scope = scope.replace(/{{tagline}}/i, phoenixCampaign.tagline);
      scope = scope.replace(/{{fact_problem}}/gi, phoenixCampaign.facts.problem);
      const reportbackInfo = phoenixCampaign.reportbackInfo;
      scope = scope.replace(/{{rb_noun}}/gi, reportbackInfo.noun);
      scope = scope.replace(/{{rb_verb}}/gi, reportbackInfo.verb);
      scope = scope.replace(/{{rb_confirmation_msg}}/i, reportbackInfo.confirmationMessage);
      scope = scope.replace(/{{cmd_reportback}}/i, process.env.GAMBIT_CMD_REPORTBACK);
      scope = scope.replace(/{{cmd_member_support}}/i, process.env.GAMBIT_CMD_MEMBER_SUPPORT);
      if (scope.indexOf('{{keyword}}') === -1) {
        return resolve(scope);
      }
    } catch (err) { return reject(err); }

    /*
    * TODO: Why is this branch here?
    * There seems to be no code that makes the function take this path
    * Is this here just for testing or future manual override?
    */
    if (signupKeyword) {
      scope = scope.replace(/{{keyword}}/i, signupKeyword);
      return resolve(scope);
    }

    // If we've made it this far, we need to render a keyword by finding the first keyword
    // for the Campaign defined in Contentful.
    return contentful.fetchKeywordsForCampaignId(phoenixCampaign.id)
      .then((keywords) => {
        // Note: We might want to add a "primary" boolean to denote which keyword should be used
        // as the default keyword when there are multiple. For now, we'll return the first to KISS.
        const keyword = keywords[0].keyword;
        scope = scope.replace(/{{keyword}}/i, keyword);

        return resolve(scope);
      })
      .catch(err => reject(err));
  });
};

/**
 * Formats given Express response and sends an object including given message, with given code.
 * @param {object} res - Express response
 * @param {number} code - HTTP status code to return
 * @param {string} message - Message to include in response object.
 */
module.exports.sendResponse = function (res, code, message) {
  let type = 'success';
  if (code > 200) {
    type = 'error';
    logger.error(message);
    stathat.postStat(`${code}: ${message}`);
  }

  const response = {};
  response[type] = { code, message };

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

/**
 * Trims given input with an ellipsis if its length is greater than 255 characters.
 * @param {string} input
 * @return {string}
 */
module.exports.trimReportbackText = function (input) {
  if (input.length > 255) {
    return `${input.substring(0, 252)}...`;
  }

  return input;
};
