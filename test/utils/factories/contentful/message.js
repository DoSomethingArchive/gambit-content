'use strict';

const stubs = require('../../stubs');

function getValidMessage() {
  const data = {
    sys: stubs.contentful.getSysWithTypeAndDate('message'),
    fields: {
      text: stubs.getRandomMessageText(),
      attachments: [
        {
          sys: {
            id: stubs.getContentfulId(),
          },
          fields: {
            file: stubs.getAttachment(),
          },
        },
      ],
    },
  };
  return data;
}

module.exports = {
  getValidMessage,
};
