'use strict';

/* eslint-disable no-param-reassign */

const logger = require('winston');

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
 * Returns passed function wrapped with functionality to retrieve and inject a rendered
 * version of the message given a replyTemplate string and args object as arguments.
 * It sends a success response to the user.
 *
 * @param  {function} fn function to be wrapped.
 * @return {function}    wrapped function
 */
function renderEndConversationMsg(fn) {
  return (replyTemplate, args) => {
    if (!args.req.user) {
      logger.verbose('renderEndConversationMsg()');
      const signup = args.req.signup;
      return helpers.sendResponseForSignup(args.res, signup, replyTemplate);
    }

    return helpers.renderMessageTemplate(args.req, replyTemplate)
      .then((replyText) => {
        args.replyText = replyText;
        fn(args);
        stathat.postStat(`campaignbot:${replyTemplate}`);
        BotRequest.log(args.req, 'campaignbot', replyTemplate, replyText);

        return helpers.sendResponse(args.res, 200, replyText, replyTemplate);
      })
      .catch(err => helpers.sendErrorResponse(args.res, err));
  };
}

/**
 * Decorator.
 * Returns passed function wrapped with functionality to retrieve and inject a rendered
 * version of the message given a replyTemplate string and args object as arguments.
 * It also saves the campaignId as the user's current_campaign
 * It sends a success response to the user.
 *
 * @param  {function} fn function to be wrapped.
 * @return {function}    wrapped function
 */
function renderContinueConversationMsg(fn) {
  return (replyTemplate, args) => {
    if (!args.req.user) {
      logger.verbose('renderContinueConversationMsg()');
      const signup = args.req.signup;
      return helpers.sendResponseForSignup(args.res, signup, replyTemplate);
    }

    return helpers.renderMessageTemplate(args.req, replyTemplate)
      .then((replyText) => {
        args.replyText = replyText;
        return args.req.user.updateCurrentCampaign(args.req.campaignId)
          .then(() => {
            logger.verbose(`saved user:${args.req.userId} current_campaign:${args.req.user.current_campaign}`);
            fn(args);
            stathat.postStat(`campaignbot:${replyTemplate}`);
            BotRequest.log(args.req, 'campaignbot', replyTemplate, replyText);
            return helpers.sendResponse(args.res, 200, replyText, replyTemplate);
          });
      })
      .catch(err => helpers.sendErrorResponse(args.res, err));
  };
}

/**
 * Reply commands
 */

 /**
  * Continues conversation with user.
  * It responds with a rendered askQuantity message
  *
  * @param  {object} args
  * @return {Command}
  */
module.exports.askQuantity = function askQuantity(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['askQuantity', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered invalidQuantity message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.invalidQuantity = function invalidQuantity(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalidQuantity', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered askCaption message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.askCaption = function askCaption(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['askCaption', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered invalidCaption message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.invalidCaption = function invalidCaption(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalidCaption', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered askWhyParticipated message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.askWhyParticipated = function askWhyParticipated(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['askWhyParticipated', args]);
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
    ['invalidWhyParticipated', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered completedMenu message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.menuCompleted = function menuCompleted(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['completedMenu', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered invalidCompletedMenuCommand message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.invalidCmdCompleted = function invalidCmdCompleted(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalidCompletedMenuCommand', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered gambitSignupMenu message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.menuSignedUp = function menuSignedUp(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['gambitSignupMenu', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered externalSignupMenu message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.externalSignupMenu = function externalSignupMenu(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['externalSignupMenu', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered invalidSignupMenuCommand message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.invalidCmdSignedup = function invalidCmdSignedup(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalidSignupMenuCommand', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered askPhoto message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.askPhoto = function askPhoto(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['askPhoto', args]);
};

/**
 * Continues conversation with user.
 * It responds with a rendered invalidPhoto message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.noPhotoSent = function noPhotoSent(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalidPhoto', args]);
};

/**
 * Ends conversation with user.
 * It responds with a rendered campaignClosed message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.campaignClosed = function campaignClosed(args) {
  return new Command(
    renderEndConversationMsg(actions.endConversation),
    ['campaignClosed', args]);
};

/**
 * Ends conversation with user.
 * It responds with a rendered memberSupport message
 *
 * @param  {object} args
 * @return {Command}
 */
module.exports.memberSupport = function memberSupport(args) {
  return new Command(
    renderEndConversationMsg(actions.endConversation),
    ['memberSupport', args]);
};
