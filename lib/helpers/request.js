'use strict';

const logger = require('winston');
const util = require('./reportback');

/**
 * @return {String}
 */
function messageText(req) {
  return req.incoming_message;
}

function hasDraftWithCaption(req) {
  return req.draftSubmission.caption;
}

function hasDraftSubmission(req) {
  return req.draftSubmission;
}

function hasSubmittedPhotoPost(req) {
  const result = req.signup.total_quantity_submitted;
  logger.verbose('hasSubmittedPhotoPost', { result });
  return result;
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
  isTextPost,
  isValidReportbackText,
  messageText,
  setDraftSubmission,
  setSignup,
};
