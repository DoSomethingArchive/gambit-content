'use strict';

const helpers = require('../helpers');
const ReplyDispatcher = require('../conversation/reply-dispatcher');
const replies = require('../conversation/replies');

module.exports = function processSupportConversation() {
  return (req, res, next) => {
    const replyDispatcher = new ReplyDispatcher();
    if (helpers.isCommand(req.incoming_message, 'member_support')) {
      return replyDispatcher.execute(replies.memberSupport({ req, res }));
    }
    return next();
  };
};
