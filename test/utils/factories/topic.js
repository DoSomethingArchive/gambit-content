'use strict';

const stubs = require('../stubs');

/**
 * @return {Object}
 */
function getValidTopic() {
  return {
    id: stubs.getContentfulId(),
    name: stubs.getRandomMessageText(),
    type: 'textPostConfig',
    postType: 'text',
    campaign: {
      id: stubs.getCampaignId(),
      title: stubs.getRandomName(),
      status: 'active',
      currentCampaignRun: {
        id: stubs.getCampaignRunId(),
      },
    },
    templates: {
      askText: stubs.getRandomMessageText(),
    },
  };
}

module.exports = {
  getValidTopic,
};
