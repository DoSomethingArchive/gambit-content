'use strict';

/**
 * Imports.
 */
const crypto = require('crypto');
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
 * Renders message for given request and messageTemplate.
 * @param {object} req - Express request
 * @param {string} messageTemplate
 */
module.exports.renderMessageTemplate = function renderMessageTemplate(req, messageTemplate) {
  newrelic.addCustomParameters({ outboundMessageTemplate: messageTemplate });

  return contentful.renderMessageForPhoenixCampaign(req.campaign, messageTemplate)
    .then((renderedMessage) => {
      let message = renderedMessage;

      // Possible for edge cases like closed campaign messages.
      if (!req.signup) {
        return module.exports.addSenderPrefix(message);
      }

      let quantity = req.signup.total_quantity_submitted;
      if (req.signup.draft_reportback_submission) {
        quantity = req.signup.draft_reportback_submission.quantity;
      }
      if (quantity) {
        message = message.replace(/{{quantity}}/gi, quantity);
      }

      const revisiting = req.keyword && req.signup.draft_reportback_submission;
      if (revisiting) {
        const continuingMessage = 'Picking up where you left off on';
        const campaignTitle = req.campaign.title;
        message = `${continuingMessage} ${campaignTitle}...\n\n${message}`;
      }

      return module.exports.addSenderPrefix(message);
    })
    .catch(err => err);
};

module.exports.getCampaignIdFromUser = function getCampaignIdFromUser(req, res) {
  const campaignId = req.user.current_campaign;
  logger.debug(`user.current_campaign:${campaignId}`);

  if (!campaignId) {
    return module.exports.sendResponse(res, 500, 'user.current_campaign undefined');
  }

  return campaignId;
};

module.exports.getKeyword = function getKeyword(req, res) {
  return contentful.fetchKeyword(req.keyword)
    .then((keyword) => {
      const environment = req.app.get('environment');
      module.exports.handleTimeout(req, res);

      if (!keyword) {
        return module.exports.sendResponse(res, 404, `Keyword ${req.keyword} not found.`);
      }

      if (keyword.fields.environment !== environment) {
        const msg = `Keyword ${req.keyword} environment error: defined as ${keyword.environment} ` +
                    `but sent to ${environment}.`;
        return module.exports.sendUnproccessibleEntityResponse(res, msg);
      }
      return keyword;
    })
    .catch(err => module.exports.sendErrorResponse(res, err));
};

module.exports.getBroadcast = function getBroadcast(req, res) {
  return contentful.fetchBroadcast(req.broadcast_id)
    .then((broadcast) => {
      module.exports.handleTimeout(req, res);

      if (!broadcast) {
        return module.exports.sendResponse(res, 404, `Broadcast ${req.broadcast_id} not found.`);
      }

      return broadcast;
    })
    .catch(err => module.exports.sendErrorResponse(res, err));
};

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
 * Replaces given input string with variables from given phoenixCampaign.
 */
module.exports.replacePhoenixCampaignVars = function (input, phoenixCampaign) {
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

    // If we've made it this far, we need to render a keyword by finding the first keyword
    // for the Campaign defined in Contentful.
    return contentful.fetchKeywordsForCampaignId(phoenixCampaign.id)
      .then((keywords) => {
        if (!keywords.length) {
          return resolve(scope);
        }
        const keyword = keywords[0];
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
 * @param {string} messageText
 * @param {string} messageTemplate
 */
module.exports.sendResponse = function (res, code, messageText, messageTemplate) {
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
  if (messageTemplate) {
    response[type].template = messageTemplate;
  }
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
  logger.debug('sendResponseForSignup()');
  const data = {
    replyTemplate,
    signup: formatSignupResponse(signup),
  };

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
