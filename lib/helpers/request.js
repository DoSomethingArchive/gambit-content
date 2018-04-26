'use strict';

const logger = require('winston');
const command = require('./command');
const util = require('./reportback');

/**
 * @return {String}
 */
function messageText(req) {
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
  return messageText(req).toUpperCase() === command.getStartCommand().toUpperCase();
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
function isValidReportbackText(req) {
  return util.isValidText(messageText(req));
}

function setDraftSubmission(req, draftSubmission) {
  req.draftSubmission = draftSubmission;
}

function setSignup(req, signup) {
  req.signup = signup;
}

module.exports = {
  hasDraftWithCaption,
  hasDraftSubmission,
  hasSubmittedPhotoPost,
  isExternalPost,
  isKeyword,
  isStartCommand,
  isTextPost,
  isValidReportbackText,
  messageText,
  setDraftSubmission,
  setSignup,
};
