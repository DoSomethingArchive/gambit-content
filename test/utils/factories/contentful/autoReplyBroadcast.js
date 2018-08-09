'use strict';

const stubs = require('../../stubs');
const autoReplyFactory = require('./autoReply');

function getValidAutoReplyBroadcast(date = Date.now()) {
  const data = {
    sys: stubs.contentful.getSysWithTypeAndDate('autoReplyBroadcast', date),
    fields: {
      text: stubs.getRandomMessageText(),
      attachments: stubs.contentful.getAttachments(),
      topic: autoReplyFactory.getValidAutoReply(),
    },
  };
  return data;
}

module.exports = {
  getValidAutoReplyBroadcast,
};
