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

function customMsg(fn) {
  return (args) => {
    fn(args);
    return helpers.sendResponse(args.res, 200, args.replyText);
  };
}

function renderEndConversationMsg(fn) {
  return (messageTemplate, args) => helpers.renderMessageForMessageType(args.req, messageTemplate)
      .then((replyMessage) => {
        args.replyText = replyMessage;
        fn(args);
        args.req.user.postDashbotOutgoing(args.replyText);
        stathat.postStat(`campaignbot:${args.replyText}`);
        BotRequest.log(args.req, 'campaignbot', messageTemplate, args.replyText);
        return helpers.sendResponse(args.res, 200, args.replyText);
      })
      .catch(err => helpers.sendErrorResponse(args.res, err));
}

function renderEndConversationWithErrorMsg(fn) {
  return (messageTemplate, args) => helpers.renderMessageForMessageType(args.req, messageTemplate)
      .then((replyMessage) => {
        args.replyText = replyMessage;
        fn(args);
        args.req.user.postDashbotOutgoing(args.replyText);
        stathat.postStat(`campaignbot:${args.replyText}`);
        BotRequest.log(args.req, 'campaignbot', messageTemplate, args.replyText);
        newrelic.addCustomParameters({ blinkSuppressRetry: true });
        args.res.setHeader('x-blink-retry-suppress', true);
        return helpers.sendErrorResponse(args.res, args.error);
      })
      .catch(err => helpers.sendErrorResponse(args.res, err));
}

function renderContinueConversationMsg(fn) {
  return (messageTemplate, args) => helpers.renderMessageForMessageType(args.req, messageTemplate)
      .then((replyMessage) => {
        args.replyText = replyMessage;

        // Store current campaign to continue conversation in subsequent messages.
        // TODO: Should this be handled more eloquently?
        args.req.user.current_campaign = args.req.campaignId;
        args.req.user.save()
          .then(() => {
            logger.verbose(`saved user:${args.req.user._id} current_campaign:${args.req.user.current_campaign}`);
            fn(args);
            args.req.user.postDashbotOutgoing(args.replyText);
            stathat.postStat(`campaignbot:${args.replyText}`);
            BotRequest.log(args.req, 'campaignbot', messageTemplate, args.replyText);
            return helpers.sendResponse(args.res, 200, args.replyText);
          });
      })
      .catch(err => helpers.sendErrorResponse(args.res, err));
}

/**
 * Reply commands
 */

module.exports.askQuantity = function askQuantity(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['ask_quantity', args]);
};

module.exports.invalidQuantity = function invalidQuantity(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalid_quantity', args]);
};

module.exports.askCaption = function askCaption(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['ask_caption', args]);
};

module.exports.invalidCaption = function invalidCaption(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalid_caption', args]);
};

module.exports.askWhyParticipated = function askWhyParticipated(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['ask_why_participated', args]);
};

module.exports.invalidWhyParticipated = function invalidWhyParticipated(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalid_why_participated', args]);
};

module.exports.menuCompleted = function menuCompleted(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['menu_completed', args]);
};

module.exports.invalidCmdCompleted = function invalidCmdCompleted(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalid_cmd_completed', args]);
};

module.exports.menuSignedUp = function menuSignedUp(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['menu_signedup_gambit', args]);
};

module.exports.invalidCmdSignedup = function invalidCmdSignedup(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['invalid_cmd_signedup', args]);
};

module.exports.askPhoto = function askPhoto(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['ask_photo', args]);
};

module.exports.noPhotoSent = function noPhotoSent(args) {
  return new Command(
    renderContinueConversationMsg(actions.continueConversation),
    ['no_photo_sent', args]);
};

module.exports.campaignClosed = function campaignClosed(args) {
  return new Command(
    renderEndConversationMsg(actions.endConversation),
    ['campaign_closed', args]);
};

module.exports.memberSupport = function memberSupport(args) {
  return new Command(
    renderEndConversationMsg(actions.endConversation),
    ['member_support', args]);
};

module.exports.legacyBugErrorOcurred = function legacyBugErrorOcurred(args) {
  return new Command(
    renderEndConversationWithErrorMsg(actions.endConversation),
    ['error_occurred', args]);
};

/**
 * Send direct message to user.
 *
 * @param  {object} args must contain req, res, text
 * @return {Command}
 */
module.exports.sendCustomMessage = function sendCustomMessage(args) {
  return new Command(
    customMsg(actions.endConversation),
    [args]);
};
