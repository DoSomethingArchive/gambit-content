'use strict';

const stubs = require('../../stubs');
const messageFactory = require('./message');

function getValidAutoReply(date = Date.now()) {
  const data = {
    sys: stubs.contentful.getSysWithTypeAndDate('autoReply', date),
    fields: {
      name: stubs.getBroadcastName(),
      autoReply: messageFactory.getValidMessage(),
      // TODO: Add a campaign reference field, returning a campaign factory's valid campaign.
    },
  };
  return data;
}

module.exports = {
  getValidAutoReply,
};
