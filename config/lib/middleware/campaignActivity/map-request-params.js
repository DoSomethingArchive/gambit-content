'use strict';

const configVars = {};

configVars.client = 'gambit-conversations';
configVars.containerProperty = 'body';
configVars.lowercaseParam = 'text';
configVars.paramsMap = {
  keyword: 'keyword',
  broadcastId: 'broadcast_id',
  campaignId: 'campaignId',
  postType: 'postType',
  text: 'incoming_message',
  mediaUrl: 'incoming_image_url',
  userId: 'userId',
  platform: 'platform',
};
module.exports = configVars;
