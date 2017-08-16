'use strict';

const helpers = require('../helpers');
const ReplyDispatcher = require('../conversation/reply-dispatcher');
const replies = require('../conversation/replies');

module.exports = function draftSubmissionCaption() {
  return (req, res, next) => {
    if (req.draftSubmission.caption) {
      return next();
    }

    if (req.isNewConversation) {
      return ReplyDispatcher.execute(replies.askCaption({ req, res }));
    }

    const input = req.incoming_message;

    if (!helpers.isValidReportbackText(input)) {
      return ReplyDispatcher.execute(replies.invalidCaption({ req, res }));
    }

    req.draftSubmission.caption = helpers.trimReportbackText(input);

    return req.draftSubmission.save()
      .then(() => {
        // If member hasn't submitted a reportback yet, ask for why_participated.
        if (!req.signup.total_quantity_submitted) {
          return ReplyDispatcher.execute(replies.askWhyParticipated({ req, res }));
        }

        // Otherwise exit to call our completed middleware
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
