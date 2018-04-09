'use strict';

const helpers = require('../../../helpers');
const reportbackHelper = require('../../../helpers/reportback');
const replies = require('../../../replies');

module.exports = function draftSubmissionCaption() {
  return (req, res, next) => {
    if (req.draftSubmission.caption) {
      return next();
    }

    if (req.askNextQuestion) {
      return replies.askCaption(req, res);
    }

    const input = req.incoming_message;

    if (!reportbackHelper.isValidText(input)) {
      return replies.invalidCaption(req, res);
    }

    req.draftSubmission.caption = reportbackHelper.trimText(input);

    return req.draftSubmission.save()
      .then(() => {
        // If member hasn't submitted a reportback yet, ask for why_participated.
        if (!req.signup.total_quantity_submitted) {
          return replies.askWhyParticipated(req, res);
        }

        // Otherwise exit to call our completed middleware
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
