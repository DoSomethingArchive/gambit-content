'use strict';

const stubs = require('../stubs');

/**
 * @return {Object}
 */
function getValidDefaultTopicTriggerWithReply() {
  return {
    id: stubs.getContentfulId(),
    trigger: stubs.getRandomMessageText(),
    reply: stubs.getRandomMessageText(),
  };
}

module.exports = {
  getValidDefaultTopicTriggerWithReply,
};
