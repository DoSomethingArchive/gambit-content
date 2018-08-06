'use strict';

const stubs = require('../../stubs');
const messageFactory = require('./message');

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
      autoReply: messageFactory.getValidMessage(),
    },
  };
  return data;
}

module.exports = {
  getValidAutoReplyBroadcast,
};
