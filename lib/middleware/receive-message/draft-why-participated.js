'use strict';

const helpers = require('../../helpers');
const reportbackHelper = require('../../helpers/reportback');
const replies = require('../../replies');

module.exports = function draftSubmissionWhyParticipated() {
  return (req, res, next) => {
    // Only ask for Why Participated if this is User's first submission for their Campaign Signup.
    if (req.signup.total_quantity_submitted) {
      return next();
    }

    if (req.askNextQuestion) {
      return replies.askWhyParticipated(req, res);
    }

    const input = req.incoming_message;

    if (!reportbackHelper.isValidText(input)) {
      return replies.invalidWhyParticipated(req, res);
    }

    req.draftSubmission.why_participated = reportbackHelper.trimText(input);

    return req.draftSubmission.save()
      .then(() => next())
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
