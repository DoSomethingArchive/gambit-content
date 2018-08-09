'use strict';

const stubs = require('../../stubs');

function getValidMessage() {
  const data = {
    sys: stubs.contentful.getSysWithTypeAndDate('message'),
    fields: {
      text: stubs.getRandomMessageText(),
      attachments: stubs.contentful.getAttachments(),
    },
  };
  return data;
}

module.exports = {
  getValidMessage,
};
