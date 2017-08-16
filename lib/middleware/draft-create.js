'use strict';

const helpers = require('../helpers');
const ReplyDispatcher = require('../conversation/reply-dispatcher');
const replies = require('../conversation/replies');

module.exports = function createDraftSubmission() {
  return (req, res, next) => {
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
