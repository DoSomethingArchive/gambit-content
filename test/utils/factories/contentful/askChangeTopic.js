'use strict';

const stubs = require('../../stubs');
const messageFactory = require('./message');
const textPostConfigFactory = require('./textPostConfig');

function getValidAskChangeTopic() {
  const data = {
    sys: {
      id: stubs.getContentfulId(),
      contentType: {
        sys: {
          id: 'askChangeTopic',
        },
      },
    },
    fields: {
      name: stubs.getBroadcastName(),
      topic: textPostConfigFactory.getValidTextPostConfig(),
      askChangeTopic: messageFactory.getValidMessage(),
      invalidAskChangeTopicResponse: messageFactory.getValidMessage(),
      saidNo: messageFactory.getValidMessage(),
      saidNoAutoReply: messageFactory.getValidMessage(),
    },
  };
  return data;
}

module.exports = {
  getValidAskChangeTopic,
};
