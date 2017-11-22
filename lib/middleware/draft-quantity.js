'use strict';

const helpers = require('../helpers');
const replies = require('../replies');

module.exports = function draftSubmissionQuantity() {
  return (req, res, next) => {
    if (req.draftSubmission.quantity) {
      return next();
    }

    if (req.isNewConversation) {
      return replies.askQuantity(req, res);
    }

    if (!helpers.isValidReportbackQuantity(req.incoming_message)) {
      return replies.invalidQuantity(req, res);
    }

    req.draftSubmission.quantity = Number(req.incoming_message);

    return req.draftSubmission.save()
      .then(() => replies.askPhoto(req, res))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
