'use strict';

/**
 * Sends replyText to User via Mobile Commons, opting User in to Chatbot OIP.
 */
module.exports.continueConversation = function continueConversation(args) {
  return args.req.user.postMobileCommonsProfileUpdate(
    process.env.MOBILECOMMONS_OIP_CHATBOT, args.replyText);
};

/**
 * Sends replyText to User via Mobile Commons, opting User in to Agent View OIP.
 */
module.exports.endConversation = function endConversation(args) {
  return args.req.user.postMobileCommonsProfileUpdate(
    process.env.MOBILECOMMONS_OIP_AGENTVIEW, args.replyText);
};
