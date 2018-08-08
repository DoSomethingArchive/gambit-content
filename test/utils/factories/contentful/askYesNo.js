'use strict';

const stubs = require('../../stubs');
const textPostConfigFactory = require('./textPostConfig');

function getValidAskYesNo(date = Date.now()) {
  return {
    sys: stubs.contentful.getSysWithTypeAndDate('askYesNo', date),
    fields: {
      name: stubs.getBroadcastName(),
      text: stubs.getRandomMessageText(),
      attachments: stubs.contentful.getAttachments(),
      topic: textPostConfigFactory.getValidTextPostConfig(),
      saidYes: stubs.getRandomMessageText(),
      saidNo: stubs.getRandomMessageText(),
      invalidAskYesNoResponse: stubs.getRandomMessageText(),
      autoReply: stubs.getRandomMessageText(),
    },
  };
}

module.exports = {
  getValidAskYesNo,
};
