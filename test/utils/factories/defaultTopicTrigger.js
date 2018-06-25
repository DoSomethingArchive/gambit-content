'use strict';

const stubs = require('../stubs');

function getDefaultTopicTrigger() {
  return {
    id: stubs.getContentfulId(),
    trigger: stubs.getRandomMessageText(),
  };
}

/**
 * @return {Object}
 */
function getValidDefaultTopicTriggerWithReply() {
  const result = getDefaultTopicTrigger();
  result.reply = stubs.getRandomMessageText();
  return result;
}

function getValidDefaultTopicTriggerWithTopic() {
  const result = getDefaultTopicTrigger();
  result.topicId = stubs.getContentfulId();
  // TODO: Add topic property
  return result;
}
module.exports = {
  getValidDefaultTopicTriggerWithReply,
  getValidDefaultTopicTriggerWithTopic,
};
