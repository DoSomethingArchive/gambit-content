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
 * Photo Post replies
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

module.exports.completedPhotoPost = function completedPhotoPost(req, res) {
  return sendResponse('completedPhotoPost', req, res);
};

module.exports.completedPhotoPostAutoReply = function completedPhotoPostAutoReply(req, res) {
  return sendResponse('completedPhotoPostAutoReply', req, res);
};

module.exports.startPhotoPost = function startPhotoPost(req, res) {
  return sendResponse('startPhotoPost', req, res);
};

module.exports.startPhotoPostAutoReply = function startPhotoPostAutoReply(req, res) {
  return sendResponse('startPhotoPostAutoReply', req, res);
};

module.exports.askPhoto = function askPhoto(req, res) {
  return sendResponse('askPhoto', req, res);
};

module.exports.noPhotoSent = function noPhotoSent(req, res) {
  return sendResponse('invalidPhoto', req, res);
};

/**
 * Text Post replies
 */
module.exports.askText = function askCaption(req, res) {
  return sendResponse('askText', req, res);
};

module.exports.invalidText = function invalidText(req, res) {
  return sendResponse('invalidText', req, res);
};

module.exports.completedTextPost = function completedTextPost(req, res) {
  return sendResponse('completedTextPost', req, res);
};
