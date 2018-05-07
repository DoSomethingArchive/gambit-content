'use strict';

const logger = require('winston');
const command = require('./command');
const util = require('./util');

/**
 * @return {String}
 */
function getMessagePhotoUrl(req) {
  return req.incoming_image_url;
}

/**
 * @return {String}
 */
function getMessageText(req) {
  return req.incoming_message;
}

/**
 * @return {Boolean}
 */
function hasDraftWithCaption(req) {
  return !!req.draftSubmission.caption;
}

/**
 * @return {Boolean}
 */
function hasDraftWithPhoto(req) {
  return !!req.draftSubmission.photo;
}

/**
 * @return {Boolean}
 */
function hasDraftWithQuantity(req) {
  return !!req.draftSubmission.quantity;
}


/**
 * @return {Boolean}
 */
function hasDraftSubmission(req) {
  return !!req.draftSubmission;
}

/**
 * @return {Boolean}
 */
function hasSubmittedPhotoPost(req) {
  const result = req.signup.total_quantity_submitted;
  logger.verbose('hasSubmittedPhotoPost', { result });
  return !!result;
}

/**
 * @return {Boolean}
 */
function isBroadcastResponse(req) {
  return !!req.broadcast_id;
}


/**
 * @return {Boolean}
 */
function isExternalPost(req) {
  return req.postType === 'external';
}

/**
 * @return {Boolean}
 */
function isKeyword(req) {
  return !!req.keyword;
}

/**
 * @return {Boolean}
 */
function isStartCommand(req) {
  const text = module.exports.getMessageText(req);
  if (!text) {
    return false;
  }
  return text.trim().toUpperCase() === command.getStartCommand().toUpperCase();
}

/**
 * @return {Boolean}
 */
function isTextPost(req) {
  return req.postType === 'text';
}

/**
 * @return {Boolean}
 */
function isValidReportbackQuantity(req) {
  // TODO: Round up/down based on remainder on Numeric quantity.
  return util.isValidQuantity(getMessageText(req));
}

/**
 * @return {Boolean}
 */
function isValidReportbackText(req) {
  return util.isValidText(getMessageText(req));
}

function setDraftSubmission(req, draftSubmission) {
  req.draftSubmission = draftSubmission;
}

function setSignup(req, signup) {
  req.signup = signup;
}

/**
 * @return {Boolean}
 */
function shouldAskNextQuestion(req) {
  return module.exports.isKeyword(req) || module.exports.isBroadcastResponse(req);
}

module.exports = {
  getMessagePhotoUrl,
  getMessageText,
  hasDraftWithCaption,
  hasDraftWithPhoto,
  hasDraftWithQuantity,
  hasDraftSubmission,
  hasSubmittedPhotoPost,
  isBroadcastResponse,
  isExternalPost,
  isKeyword,
  isStartCommand,
  isTextPost,
  isValidReportbackQuantity,
  isValidReportbackText,
  setDraftSubmission,
  setSignup,
  shouldAskNextQuestion,
};
