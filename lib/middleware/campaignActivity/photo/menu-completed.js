'use strict';

const replies = require('../../../replies');

module.exports = function postCompleted() {
  return (req, res, next) => {
    // If our Signup has a draft in progress, we don't reply with the Campaign menu until the User
    // has succesffully submitted their draft.
    if (req.draftSubmission) {
      return next();
    }

    if (!req.signup.reportback) {
      return next();
    }

    if (req.askNextQuestion) {
      return replies.photoPostCompleted(req, res);
    }

    return replies.photoPostCompletedAutoReply(req, res);
  };
};
