'use strict';

const replies = require('../../replies');

module.exports = function doingMenu() {
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
      return replies.menuCompleted(req, res);
    }

    // Otherwise member didn't text back a Reportback or Member Support command.
    return replies.invalidCmdCompleted(req, res);
  };
};
