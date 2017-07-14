'use strict';

/* eslint-disable no-param-reassign */

const logger = require('winston');
const newrelic = require('newrelic');

const Command = require('./command');
const actions = require('./actions');
const helpers = require('../helpers');
const stathat = require('../stathat');
const BotRequest = require('../../app/models/BotRequest');

/**
 * Decorators
 */

 /**
  * Decorator.
  * Returns passed function wrapped with functionality to respond with a succes response to
  * the user.
  *
  * @param  {function} fn function to be wrapped.
  * @return {function}    wrapped function
  */
function customMsg(fn) {
  return (args) => {
    fn(args);
    return helpers.sendResponse(args.res, 200, args.replyText);
  };
}

/**
 * Decorator.
 * Returns passed function wrapped with functionality to retrieve and inject a rendered
 * version of the message given a messageTemplate string and args object as arguments.
 * It sends a succes response to the user.
 *
 * @param  {function} fn function to be wrapped.
 * @return {function}    wrapped function
 */
function renderEndConversationMsg(fn) {
  return (messageTemplate, args) => helpers.renderMessageForMessageType(args.req, messageTemplate)
      .then((replyMessage) => {
        args.replyText = replyMessage;
        args.req.user.updateConversation(messageTemplate)
          .then(() => {
            fn(args);
            args.req.user.setLastOutboundTemplate(messageTemplate);
            args.req.user.postDashbotOutgoing(messageTemplate);
            stathat.postStat(`campaignbot:${messageTemplate}`);
            BotRequest.log(args.req, 'campaignbot', messageTemplate, args.replyText);
            return helpers.sendResponse(args.res, 200, args.replyText);
          });
      })
      .catch(err => helpers.sendErrorResponse(args.res, err));
}

/**
 * Decorator.
 * Returns passed function wrapped with functionality to retrieve and inject a rendered
 * version of the message given a messageTemplate string and args object as arguments.
 * It sends an error response to the user.
 *
 * @param  {function} fn function to be wrapped.
 * @return {function}    wrapped function
 */
function renderEndConversationWithErrorMsg(fn) {
  return (messageTemplate, args) => helpers.renderMessageForMessageType(args.req, messageTemplate)
      .then((replyMessage) => {
        args.replyText = replyMessage;

        args.req.user.updateConversation(messageTemplate)
          .then(() => {
            fn(args);
            args.req.user.setLastOutboundTemplate(messageTemplate);
            args.req.user.postDashbotOutgoing(messageTemplate);
            stathat.postStat(`campaignbot:${messageTemplate}`);
            BotRequest.log(args.req, 'campaignbot', messageTemplate, args.replyText);
            newrelic.addCustomParameters({ blinkSuppressRetry: true });
            args.res.setHeader('x-blink-retry-suppress', true);
            return helpers.sendErrorResponse(args.res, args.error);
          });
      })
      .catch(err => helpers.sendErrorResponse(args.res, err));
}


/**
 * Decorator.
 * Returns passed function wrapped with functionality to retrieve and inject a rendered
 * version of the message given a messageTemplate string and args object as arguments.
 * It also saves the campaignId as the user's current_campaign
 * It sends a success response to the user.
 *
 * @param  {function} fn function to be wrapped.
 * @return {function}    wrapped function
 */
function renderContinueConversationMsg(fn) {
  return (messageTemplate, args) => helpers.renderMessageForMessageType(args.req, messageTemplate)
      .then((replyMessage) => {
        args.replyText = replyMessage;

        // User's Current Campaign may need to be updated, pass req.campaignId to check.
        args.req.user.updateConversation(messageTemplate, args.req.campaignId)
          .then(() => {
            logger.verbose(`saved user:${args.req.user._id} current_campaign:${args.req.user.current_campaign}`);
            fn(args);
            args.req.user.postDashbotOutgoing(messageTemplate);
            stathat.postStat(`campaignbot:${messageTemplate}`);
            BotRequest.log(args.req, 'campaignbot', messageTemplate, args.replyText);
            return helpers.sendResponse(args.res, 200, args.replyText);
          });
      })
      .catch(err => helpers.sendErrorResponse(args.res, err));
}

/**
 * Reply commands
 */

 /**
  * Continues conversation with user.
  * It responds with a rendered ask_quantity message
  *
  * @param  {object} args
  * @return {Command}
  */
module.exports.askQuantity = function askQuantity(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['ask_quantity', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered invalid_quantity message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.invalidQuantity = function invalidQuantity(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalid_quantity', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered ask_caption message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.askCaption = function askCaption(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['ask_caption', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered invalid_caption message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.invalidCaption = function invalidCaption(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalid_caption', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered ask_why_participated message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.askWhyParticipated = function askWhyParticipated(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['ask_why_participated', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered invalid_why_participated message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.invalidWhyParticipated = function invalidWhyParticipated(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalid_why_participated', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered menu_completed message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.menuCompleted = function menuCompleted(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['menu_completed', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered invalid_cmd_completed message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.invalidCmdCompleted = function invalidCmdCompleted(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalid_cmd_completed', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered menu_signedup_gambit message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.menuSignedUp = function menuSignedUp(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['menu_signedup_gambit', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered menu_signedup_external message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.externalSignupMenu = function externalSignupMenu(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['menu_signedup_external', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered invalid_cmd_signedup message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.invalidCmdSignedup = function invalidCmdSignedup(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalid_cmd_signedup', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered ask_photo message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.askPhoto = function askPhoto(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['ask_photo', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered no_photo_sent message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.noPhotoSent = function noPhotoSent(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['no_photo_sent', args]);
};

/**
 * Ends conversation with user.
 * It responds with a rendered campaign_closed message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.campaignClosed = function campaignClosed(args) {
  return new Command(
    renderEndConversationMsg(actions.endConversation),
    ['campaign_closed', args]);
};

/**
 * Ends conversation with user.
 * It responds with a rendered member_support message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.memberSupport = function memberSupport(args) {
  return new Command(
    renderEndConversationMsg(actions.endConversation),
    ['member_support', args]);
};


/**
 * Ends conversation with user.
 * It responds with a rendered error_occurred message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.legacyBugErrorOcurred = function legacyBugErrorOcurred(args) {
  return new Command(
    renderEndConversationWithErrorMsg(actions.endConversation),
    ['error_occurred', args]);
};

/**
 * Ends conversation with user
 * It responds with a custom message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.sendCustomMessage = function sendCustomMessage(args) {
  return new Command(
    customMsg(actions.endConversation),
    [args]);
};
