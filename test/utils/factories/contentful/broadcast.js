'use strict';

const stubs = require('../../stubs');

module.exports.getValidCampaignBroadcast = function getValidCampaignBroadcast(date = Date.now()) {
  return {
    sys: {
      id: stubs.getBroadcastId(),
      contentType: {
        sys: {
          id: 'broadcast',
        },
      },
      createdAt: date,
      updatedAt: date,
    },
    fields: {
      name: stubs.getBroadcastName(),
      topic: null,
      message: stubs.getRandomMessageText(),
      template: 'askSignup',
      campaign: {
        sys: {
          id: stubs.getContentfulId(),
        },
        fields: {
          campaignId: stubs.getCampaignId(),
        },
      },
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
};

module.exports.getValidTopicBroadcast = function getValidTopicBroadcast(date = Date.now()) {
  const broadcast = module.exports.getValidCampaignBroadcast(date);
  broadcast.fields.topic = stubs.getRandomWord();
  broadcast.fields.campaign = null;
  broadcast.fields.template = null;
  return broadcast;
};
