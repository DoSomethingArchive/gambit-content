'use strict';

const configVars = {};

configVars.client = 'mobilecommons';
configVars.containerProperty = 'body';
configVars.emojiStripParam = 'args';
configVars.lowercaseParam = 'keyword';
configVars.paramsMap = {
  phone: 'phone',
  keyword: 'keyword',
  profile_id: 'profile_id',
  broadcast_id: 'broadcast_id',
  args: 'incoming_message',
  mms_image_url: 'incoming_image_url',
};
module.exports = configVars;
