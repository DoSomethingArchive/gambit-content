'use strict';

const stubs = require('../stubs');

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
    },
  };
}

function getValidCampaignBroadcast(date = Date.now()) {
  const broadcast = getValidBroadcast(date);
  broadcast.message.template = 'askSignup';
  broadcast.campaignId.stubs.getCampaignId();
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
