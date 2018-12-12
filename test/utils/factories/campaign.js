'use strict';

const stubs = require('../stubs');

function getValidCampaign() {
  return {
    id: stubs.getCampaignId(),
    title: stubs.getRandomMessageText(),
    status: 'active',
    endDate: null,
    config: {
      webSignup: {
        text: stubs.getRandomMessageText(),
        topic: {},
      },
    },
  };
}

module.exports = {
  getValidCampaign,
};
