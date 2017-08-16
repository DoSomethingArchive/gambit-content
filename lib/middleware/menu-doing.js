'use strict';

const ReplyDispatcher = require('../conversation/reply-dispatcher');
const replies = require('../conversation/replies');

module.exports = function doingMenu() {
  return (req, res, next) => {
    if (req.draftSubmission) {
      return next();
    }

    if (req.isNewConversation) {
      return ReplyDispatcher.execute(replies.menuSignedUp({ req, res }));
    }

    return ReplyDispatcher.execute(replies.invalidCmdSignedup({ req, res }));
  };
};
