'use strict';

module.exports.continueConversation = function continueConversation(args) {
  return args.req.user.postMobileCommonsProfileUpdate(
    process.env.MOBILECOMMONS_OIP_CHATBOT, args.replyText);
};

module.exports.endConversation = function endConversation(args) {
  return args.req.user.postMobileCommonsProfileUpdate(
    process.env.MOBILECOMMONS_OIP_AGENTVIEW, args.replyText);
};
