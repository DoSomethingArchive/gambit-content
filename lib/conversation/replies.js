'use strict';

const Command = require('./command');
const helpers = require('../helpers');
const stathat = require('../stathat');

/**
 * Sends success response.
 *
 * @param {string} replyTemplate
 * @param {object} args
 */
function sendResponse(replyTemplate, args) {
  const signup = args.req.signup;
  stathat.postStat(`template:${replyTemplate}`);
  return helpers.sendResponseForSignup(args.res, signup, replyTemplate);
}

/**
 * Reply commands
 */
module.exports.askQuantity = function askQuantity(args) {
  return new Command(sendResponse('askQuantity', args));
};

module.exports.invalidQuantity = function invalidQuantity(args) {
  return new Command(sendResponse('invalidQuantity', args));
};

module.exports.askCaption = function askCaption(args) {
  return new Command(sendResponse('askCaption', args));
};

module.exports.invalidCaption = function invalidCaption(args) {
  return new Command(sendResponse('invalidCaption', args));
};

module.exports.askWhyParticipated = function askWhyParticipated(args) {
  return new Command(sendResponse('askWhyParticipated', args));
};

module.exports.invalidWhyParticipated = function invalidWhyParticipated(args) {
  return new Command(sendResponse('invalidWhyParticipated', args));
};

module.exports.menuCompleted = function menuCompleted(args) {
  return new Command(sendResponse('completedMenu', args));
};

module.exports.invalidCmdCompleted = function invalidCmdCompleted(args) {
  return new Command(sendResponse('invalidCompletedMenuCommand', args));
};

module.exports.menuSignedUp = function menuSignedUp(args) {
  return new Command(sendResponse('gambitSignupMenu', args));
};

module.exports.externalSignupMenu = function externalSignupMenu(args) {
  return new Command(sendResponse('externalSignupMenu', args));
};

module.exports.invalidCmdSignedup = function invalidCmdSignedup(args) {
  return new Command(sendResponse('invalidSignupMenuCommand', args));
};

module.exports.askPhoto = function askPhoto(args) {
  return new Command(sendResponse('askPhoto', args));
};

module.exports.noPhotoSent = function noPhotoSent(args) {
  return new Command(sendResponse('invalidPhoto', args));
};

module.exports.campaignClosed = function campaignClosed(args) {
  return new Command(sendResponse('campaignClosed', args));
};

module.exports.memberSupport = function memberSupport(args) {
  return new Command(sendResponse('memberSupport', args));
};
