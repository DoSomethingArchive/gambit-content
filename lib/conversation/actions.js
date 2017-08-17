'use strict';

function isGambitConversationsRequest(args) {
  return args.req.client === 'gambit-conversations';
}

/**
 * Sends replyText to User via Mobile Commons, opting User in to Chatbot OIP.
 */
module.exports.continueConversation = function continueConversation(args) {
  if (isGambitConversationsRequest(args)) {
    return null;
  }
  return args.req.user.postMobileCommonsProfileUpdate(
    process.env.MOBILECOMMONS_OIP_CHATBOT, args.replyText);
};

/**
 * Sends replyText to User via Mobile Commons, opting User in to Agent View OIP.
 */
module.exports.endConversation = function endConversation(args) {
  if (isGambitConversationsRequest(args)) {
    return null;
  }
  return args.req.user.postMobileCommonsProfileUpdate(
    process.env.MOBILECOMMONS_OIP_AGENTVIEW, args.replyText);
};
