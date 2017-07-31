'use strict';

const helpers = require('../helpers');
const ReplyDispatcher = require('../conversation/reply-dispatcher');
const replies = require('../conversation/replies');

module.exports = function createNewDraftSubmission() {
  return (req, res, next) => {
    // Is there a draft in progress?
    const draftSubmission = req.signup.draft_reportback_submission;
    // If not, create one if User has sent us the Reportback command.
    const createDraft = !draftSubmission && helpers.isCommand(req.incoming_message, 'reportback');

    if (createDraft) {
      return req.signup.createDraftReportbackSubmission()
        // The first question we ask is for the Submission Quantity.
        .then(() => ReplyDispatcher.execute(replies.askQuantity({ req, res })))
        .catch(err => helpers.sendErrorResponse(res, err));
    }

    return next();
  };
};
