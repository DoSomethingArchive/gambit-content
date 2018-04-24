'use strict';

const util = require('./reportback');

/**
 * @return {String}
 */
function messageText(req) {
  return req.incoming_message;
}

function hasDraftWithCaption(req) {
  return req.signup.draft_reportback_submission.caption;
}

function hasDraftSubmission(req) {
  return req.signup.draft_reportback_submission;
}

function hasSubmittedPhotoPost(req) {
  return req.signup.total_quantity_submitted;
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

module.exports = {
  hasDraftWithCaption,
  hasDraftSubmission,
  hasSubmittedPhotoPost,
  isExternalPost,
  isTextPost,
  isValidReportbackText,
  messageText,
};
