'use strict';

const stubs = require('../stubs');

function getValidCampaignBroadcast(date = Date.now()) {
  return {
    id: stubs.getBroadcastId(),
    name: stubs.getBroadcastName(),
    createdAt: date,
    updatedAt: date,
    message: {
      text: stubs.getRandomMessageText(),
      attachments: [],
      template: 'askSignup',
    },
    campaignId: stubs.getCampaignId(),
  };
}

function getValidTopicBroadcast(date = Date.now()) {
  const data = getValidCampaignBroadcast(date);
  data.topic = 'survey_response';
  data.message.template = 'rivescript';
  delete data.campaignId;
  return data;
}

module.exports = {
  getValidCampaignBroadcast,
  getValidTopicBroadcast,
};
