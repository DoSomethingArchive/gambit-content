'use strict';

const stubs = require('../stubs');
const topicFactory = require('./topic');

function getValidBroadcast(date = Date.now()) {
  return {
    id: stubs.getBroadcastId(),
    name: stubs.getBroadcastName(),
    createdAt: date,
    updatedAt: date,
    message: {
      text: stubs.getRandomMessageText(),
      attachments: [],
      template: 'textPostBroadcast',
      topic: topicFactory.getValidTopic(),
    },
  };
}

function getValidCampaignBroadcast(date = Date.now()) {
  const broadcast = getValidBroadcast(date);
  broadcast.message.template = 'askSignup';
  broadcast.campaignId = stubs.getCampaignId();
  return broadcast;
}

function getValidTopicBroadcast(date = Date.now()) {
  const data = getValidCampaignBroadcast(date);
  data.topic = 'survey_response';
  data.message.template = 'rivescript';
  delete data.campaignId;
  return data;
}

module.exports = {
  getValidBroadcast,
  getValidCampaignBroadcast,
  getValidTopicBroadcast,
};
