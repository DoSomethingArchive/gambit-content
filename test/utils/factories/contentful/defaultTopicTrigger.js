'use strict';

const stubs = require('../../stubs');
const autoReplyTransitionFactory = require('./autoReplyTransition');

function getValidDefaultTopicTrigger(responseEntry) {
  return {
    sys: stubs.contentful.getSysWithTypeAndDate('defaultTopicTrigger'),
    fields: {
      trigger: stubs.getRandomWord(),
      response: responseEntry || autoReplyTransitionFactory.getValidAutoReplyTransition(),
    },
  };
}

module.exports = {
  getValidDefaultTopicTrigger,
};
