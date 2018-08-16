'use strict';

const stubs = require('../../stubs');
const autoReplyFactory = require('./autoReply');
const textPostConfigFactory = require('./textPostConfig');

function getValidAskYesNo(date = Date.now()) {
  return {
    sys: stubs.contentful.getSysWithTypeAndDate('askYesNo', date),
    fields: {
      name: stubs.getBroadcastName(),
      text: stubs.getRandomMessageText(),
      attachments: stubs.contentful.getAttachments(),
      saidYes: stubs.getRandomMessageText(),
      saidYesTopic: textPostConfigFactory.getValidTextPostConfig(),
      saidNo: stubs.getRandomMessageText(),
      saidNoTopic: autoReplyFactory.getValidAutoReplyWithoutCampaign(),
      invalidAskYesNoResponse: stubs.getRandomMessageText(),
    },
  };
}

module.exports = {
  getValidAskYesNo,
};
