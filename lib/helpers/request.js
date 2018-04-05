'use strict';

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
function isTextPost(req) {
  return req.postType === 'text';
}

/**
 * @return {Boolean}
 */
function isValidReportbackText(req) {
  return util.isValidText(messageText(req));
}

/**
 * @return {Boolean}
 */
function shouldAskNextQuestion(req) {
  return req.keyword || req.broadcast_id;
}

module.exports = {
  isTextPost,
  isValidReportbackText,
  shouldAskNextQuestion,
};
