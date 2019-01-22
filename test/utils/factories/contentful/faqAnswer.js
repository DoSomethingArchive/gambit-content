'use strict';

const stubs = require('../../stubs');

function getValidFaqAnswer() {
  const data = {
    sys: stubs.contentful.getSysWithTypeAndDate('faqAnswer'),
    fields: {
      name: stubs.getRandomMessageText(),
      text: stubs.getRandomMessageText(),
    },
  };
  return data;
}

module.exports = {
  getValidFaqAnswer,
};
