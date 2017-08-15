'use strict';

const configVars = {};

configVars.client = 'gambit-conversations';
configVars.containerProperty = 'body';
configVars.emojiStripParam = 'text';
configVars.lowercaseParam = 'text';
configVars.paramsMap = {
  keyword: 'keyword',
  broadcastId: 'broadcast_id',
  text: 'incoming_message',
  mediaUrl: 'incoming_image_url',
};
module.exports = configVars;
