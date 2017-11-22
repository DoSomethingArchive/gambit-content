'use strict';

/**
 * Imports.
 */
const logger = require('winston');
const newrelic = require('newrelic');
const camelCaseKeys = require('camelcase-keys-deep');
const underscore = require('underscore');

const contentful = require('./contentful');
const stathat = require('./stathat');

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
 * @param {string} message
 * @return {boolean}
 */
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
  scope = scope.replace(/{{fact_problem}}/gi, phoenixCampaign.facts.problem);
  const reportbackInfo = phoenixCampaign.reportbackInfo;
  scope = scope.replace(/{{rb_noun}}/gi, reportbackInfo.noun);
  scope = scope.replace(/{{rb_verb}}/gi, reportbackInfo.verb);
  scope = scope.replace(/{{rb_confirmation_msg}}/i, reportbackInfo.confirmationMessage);
  scope = scope.replace(/{{cmd_reportback}}/i, process.env.GAMBIT_CMD_REPORTBACK);
  scope = scope.replace(/{{cmd_member_support}}/i, process.env.GAMBIT_CMD_MEMBER_SUPPORT);
  if (phoenixCampaign.keywords) {
    scope = scope.replace(/{{keyword}}/gi, phoenixCampaign.keywords[0]);
  }
  return scope;
};

/**
 * Replaces given input string with variables from given phoenixCampaign.
 */
module.exports.findAndReplaceKeywordVarForCampaignId = function (input, campaignId) {
  return new Promise((resolve, reject) => {
    logger.debug(`helpers.findAndReplaceKeywordVarForCampaignId:${campaignId}`);
    if (!input) {
      return resolve('');
    }

    return contentful.fetchKeywordsForCampaignId(campaignId)
      .then((keywords) => {
        if (!keywords.length) {
          return resolve(input);
        }
        const keyword = keywords[0];
        const result = input.replace(/{{keyword}}/i, keyword);

        return resolve(result);
      })
      .catch(err => reject(err));
  });
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
 * Converts a Signup document (and its nested draft Reportback Submission) into an object with
 * camelCase keys.
 * @param {Signup} signupDoc
 * @return {object}
 */
function formatSignupResponse(signupDoc) {
  const draftDoc = signupDoc.draft_reportback_submission;
  let draftId;
  if (draftDoc && draftDoc._id) {
    draftId = draftDoc._id.toString();
  }

  const signupObject = signupDoc.toObject();
  const omitKeys = ['__v'];
  const formattedSignup = camelCaseKeys(underscore.omit(signupObject, omitKeys));
  formattedSignup.id = Number(formattedSignup.id);

  if (draftDoc) {
    const draft = formattedSignup.draftReportbackSubmission;
    // We don't need to repeat the Campaign property inside our draft Reportback Submission, it's
    // defined on the Signup.
    omitKeys.push('campaign');
    formattedSignup.draftReportbackSubmission = underscore.omit(draft, omitKeys);
    // A Mongo ObjectId gets converted to an id object, we just want an ID string.
    formattedSignup.draftReportbackSubmission.id = draftId;
  }

  // Return ID properties as objects instead.
  formattedSignup.campaign = { id: formattedSignup.campaign };
  formattedSignup.user = { id: formattedSignup.user };
  if (formattedSignup.reportback) {
    formattedSignup.reportback = { id: formattedSignup.reportback };
  }

  return formattedSignup;
}

/**
 * Sends response with the request Signup and the template to reply with.
 * @param {object} res - Express response
 * @param {Signup} signup
 * @param {string} replyTemplate
 */
module.exports.sendResponseForSignup = function (res, signup, replyTemplate) {
  const data = {
    replyTemplate,
    signup: formatSignupResponse(signup),
  };
  logger.info('helpers.sendResponseForSignup', { signupId: data.signup.id, replyTemplate });
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
