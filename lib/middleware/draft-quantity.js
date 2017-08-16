'use strict';

const helpers = require('../helpers');
const ReplyDispatcher = require('../conversation/reply-dispatcher');
const replies = require('../conversation/replies');

module.exports = function draftSubmissionQuantity() {
  return (req, res, next) => {
    if (req.draftSubmission.quantity) {
      return next();
    }

    if (req.isNewConversation) {
      return ReplyDispatcher.execute(replies.askQuantity({ req, res }));
    }

    if (!helpers.isValidReportbackQuantity(req.incoming_message)) {
      return ReplyDispatcher.execute(replies.invalidQuantity({ req, res }));
    }

    req.draftSubmission.quantity = Number(req.incoming_message);

    return req.draftSubmission.save()
      .then(() => ReplyDispatcher.execute(replies.askPhoto({ req, res })))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
