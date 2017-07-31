'use strict';

const helpers = require('../helpers');
const ReplyDispatcher = require('../conversation/reply-dispatcher');
const replies = require('../conversation/replies');

module.exports = function createNewDraftSubmission() {
  return (req, res, next) => {
    // Is there a draft in progress?
    req.draftSubmission = req.signup.draft_reportback_submission;
    // If not, create one if User has completed the Campaign and wants to post their submission.
    const newDraft = !req.draftSubmission && helpers.isCommand(req.incoming_message, 'reportback');

    if (newDraft) {
      return req.signup.createDraftReportbackSubmission()
        .then(() => ReplyDispatcher.execute(replies.askQuantity({ req, res })))
        .catch(err => helpers.sendErrorResponse(res, err));
    }

    return next();
  };
};
