'use strict';

const helpers = require('./helpers');
const stathat = require('./stathat');

/**
 * Sends success response.
 *
 * @param {string} replyTemplate
 * @param {object} args
 */
function sendResponse(replyTemplate, req, res) {
  const signup = req.signup;
  stathat.postStat(`template:${replyTemplate}`);
  return helpers.sendResponseForSignup(res, signup, replyTemplate);
}

/**
 * Reply commands
 */
module.exports.askQuantity = function askQuantity(req, res) {
  return sendResponse('askQuantity', req, res);
};

module.exports.invalidQuantity = function invalidQuantity(req, res) {
  return sendResponse('invalidQuantity', req, res);
};

module.exports.askCaption = function askCaption(req, res) {
  return sendResponse('askCaption', req, res);
};

module.exports.invalidCaption = function invalidCaption(req, res) {
  return sendResponse('invalidCaption', req, res);
};

module.exports.askWhyParticipated = function askWhyParticipated(req, res) {
  return sendResponse('askWhyParticipated', req, res);
};

module.exports.invalidWhyParticipated = function invalidWhyParticipated(req, res) {
  return sendResponse('invalidWhyParticipated', req, res);
};

module.exports.photoPostCompleted = function photoPostCompleted(req, res) {
  return sendResponse('photoPostCompleted', req, res);
};

module.exports.photoPostCompletedAutoReply = function photoPostCompletedAutoReply(req, res) {
  return sendResponse('photoPostCompletedAutoReply', req, res);
};

module.exports.startPhotoPost = function startPhotoPost(req, res) {
  return sendResponse('botSignupConfirmed', req, res);
};

module.exports.startPhotoPostAutoReply = function startPhotoPostAutoReply(req, res) {
  return sendResponse('signupConfirmedAutoReply', req, res);
};

module.exports.askPhoto = function askPhoto(req, res) {
  return sendResponse('askPhoto', req, res);
};

module.exports.noPhotoSent = function noPhotoSent(req, res) {
  return sendResponse('invalidPhoto', req, res);
};

module.exports.campaignClosed = function campaignClosed(req, res) {
  return sendResponse('campaignClosed', req, res);
};

module.exports.memberSupport = function memberSupport(req, res) {
  return sendResponse('memberSupport', req, res);
};

module.exports.askText = function askCaption(req, res) {
  return sendResponse('botSignupConfirmed', req, res);
};

module.exports.invalidText = function invalidText(req, res) {
  return sendResponse('invalidText', req, res);
};

module.exports.textPostCompleted = function textPostCompleted(req, res) {
  return sendResponse('textPostCompleted', req, res);
};
