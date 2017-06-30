'use strict';

const helpers = require('../helpers');
const ReplyDispatcher = require('../conversation/reply-dispatcher');
const replies = require('../conversation/replies');

module.exports = function processSupportConversation() {
  return (req, res, next) => {
    if (helpers.isCommand(req.incoming_message, 'member_support')) {
      return ReplyDispatcher.execute(replies.memberSupport({ req, res }));
    }
    return next();
  };
};
