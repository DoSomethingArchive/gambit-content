'use strict';

const stubs = require('../../stubs');
const autoReplyFactory = require('./autoReply');

function getValidAutoReplyTransition(date = Date.now()) {
  const data = {
    sys: stubs.contentful.getSysWithTypeAndDate('autoReplyTransition', date),
    fields: {
      text: stubs.getRandomMessageText(),
      attachments: stubs.contentful.getAttachments(),
      topic: autoReplyFactory.getValidAutoReply(),
    },
  };
  return data;
}

module.exports = {
  getValidAutoReplyTransition,
};
