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
      // TODO: This will be removed.
      // @see lib/helpers/campaign.parseCampaign
      currentCampaignRun: {
        id: stubs.getCampaignId(),
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
