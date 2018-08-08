'use strict';

const stubs = require('../../stubs');
const messageFactory = require('./message');
const autoReplyFactory = require('./autoReply');

function getValidAutoReplyBroadcast() {
  const data = {
    sys: {
      id: stubs.getContentfulId(),
      contentType: {
        sys: {
          id: 'autoReplyBroadcast',
        },
      },
    },
    fields: {
      broadcast: messageFactory.getValidMessage(),
      topic: autoReplyFactory.getValidAutoReply(),
    },
  };
  return data;
}

module.exports = {
  getValidAutoReplyBroadcast,
};
