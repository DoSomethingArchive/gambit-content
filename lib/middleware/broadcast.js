'use strict';

const logger = require('winston');

const helpers = require('../helpers');
const ReplyDispatcher = require('../conversation/reply-dispatcher');
const replies = require('../conversation/replies');
const BotRequest = require('../../app/models/BotRequest');

module.exports = function processBroadcast() {
  return (req, res, next) => {
    if (!req.broadcast_id) {
      return next();
    }

    logger.info(`loaded broadcast:${req.broadcast_id} for user:${req.user._id}`);
    const saidNo = !(req.incoming_message && helpers.isYesResponse(req.incoming_message));

    if (saidNo) {
      const replyMessage = helpers
        .addSenderPrefix(req.broadcastDeclinedMessage);

      logger.info(`user:${req.user._id} declined broadcast:${req.broadcast_id}`);
      BotRequest.log(req, 'broadcast', 'prompt_declined', replyMessage);

      return ReplyDispatcher.execute(
        replies.sendCustomMessage({ req, res, replyText: replyMessage }));
    }

    return next();
  };
};
