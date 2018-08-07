'use strict';

const stubs = require('../../stubs');
const messageFactory = require('./message');
const textPostConfigFactory = require('./textPostConfig');

function getValidAskYesNo(date = Date.now()) {
  const data = {
    sys: stubs.contentful.getSysWithTypeAndDate('askYesNo', date),
    fields: {
      name: stubs.getBroadcastName(),
      askYesNo: messageFactory.getValidMessage(),
      saidYes: textPostConfigFactory.getValidTextPostConfig(),
      saidNo: messageFactory.getValidMessage(),
      invalidAskYesNoResponse: messageFactory.getValidMessage(),
      saidNoAutoReply: messageFactory.getValidMessage(),
    },
  };
  return data;
}

module.exports = {
  getValidAskYesNo,
};
