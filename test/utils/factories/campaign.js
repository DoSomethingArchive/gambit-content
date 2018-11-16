'use strict';

const stubs = require('../stubs');

function getValidCampaign() {
  return {
    id: stubs.getCampaignId(),
    title: stubs.getRandomMessageText(),
    currentCampaignRun: {
      id: stubs.getCampaignRunId(),
    },
  };
}

module.exports = {
  getValidCampaign,
};
