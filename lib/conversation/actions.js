'use strict';

function isMobileCommonsRequest(args) {
  return args.req.client === 'mobilecommons';
}

/**
 * Sends replyText to User via Mobile Commons, opting User in to Chatbot OIP.
 */
module.exports.continueConversation = function continueConversation(args) {
  if (!isMobileCommonsRequest(args)) {
    return null;
  }
  return args.req.user.postMobileCommonsProfileUpdate(
    process.env.MOBILECOMMONS_OIP_CHATBOT, args.replyText);
};

/**
 * Sends replyText to User via Mobile Commons, opting User in to Agent View OIP.
 */
module.exports.endConversation = function endConversation(args) {
  if (!isMobileCommonsRequest(args)) {
    return null;
  }
  return args.req.user.postMobileCommonsProfileUpdate(
    process.env.MOBILECOMMONS_OIP_AGENTVIEW, args.replyText);
};
