'use strict';

const ReplyDispatcher = require('../conversation/reply-dispatcher');
const replies = require('../conversation/replies');

module.exports = function signupMenuReplies() {
  return (req, res, next) => {
    // If our Signup has a draft in progress, we don't reply with the Campaign menu until the User
    // has succesffully submitted their draft.
    if (req.signup.draft_reportback_submission) {
      return next();
    }

    // If member has completed this campaign:
    if (req.signup.reportback) {
      if (req.isNewConversation) {
        return ReplyDispatcher.execute(replies.menuCompleted({ req, res }));
      }
      // Otherwise member didn't text back a Reportback or Member Support command.
      return ReplyDispatcher.execute(replies.invalidCmdCompleted({ req, res }));
    }

    if (req.isNewConversation) {
      return ReplyDispatcher.execute(replies.menuSignedUp({ req, res }));
    }

    return ReplyDispatcher.execute(replies.invalidCmdSignedup({ req, res }));
  };
};
