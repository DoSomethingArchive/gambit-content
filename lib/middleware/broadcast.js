'use strict';

const logger = require('winston');
const helpers = require('../helpers');

const BotRequest = require('../../app/models/BotRequest');

module.exports = function processBroadcast() {
  return (req, res, next) => {
    if (!req.broadcast_id) {
      return next();
    }

    logger.info(`loaded broadcast:${req.broadcast_id} for user:${req.user._id}`);
    const saidNo = !(req.incoming_message && helpers.isYesResponse(req.incoming_message));

    if (saidNo) {
      logger.info(`user:${req.user._id} declined broadcast:${req.broadcast_id}`);

      const replyMessage = helpers
        .addSenderPrefix(req.broadcastDeclinedMessage);
      BotRequest.log(req, 'broadcast', 'prompt_declined', replyMessage);
      req.user.postDashbotOutgoing('broadcast_declined');

      return helpers.endConversationWithMessage(req, res, replyMessage);
    }

    return next();
  };
};
