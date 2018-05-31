'use strict';

const stubs = require('../../stubs');

function getValidDefaultTopicTrigger() {
  const data = {
    sys: {
      id: '51QDjTsMbmCcW804IUGaQg',
      contentType: {
        sys: {
          id: 'defaultTopicTrigger',
        },
      },
    },
    fields: {
      trigger: stubs.getRandomWord(),
    },
  };
  return data;
}

module.exports = {
  getValidDefaultTopicTrigger,
};
