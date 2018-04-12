'use strict';

const replies = require('../../../replies');

module.exports = function startFirstSubmission() {
  return (req, res, next) => {
    if (req.draftSubmission) {
      return next();
    }

    if (req.askNextQuestion) {
      return replies.askStart(req, res);
    }

    return replies.invalidStart(req, res);
  };
};
