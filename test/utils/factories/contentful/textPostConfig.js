'use strict';

const stubs = require('../../stubs');
const campaignFactory = require('./campaign');

function getValidTextPostConfig() {
  const data = {
    sys: {
      id: '6tckfP2GgEuoOG8wieEoGu',
      contentType: {
        sys: {
          id: 'textPostConfig',
        },
      },
    },
    fields: {
      name: stubs.getRandomMessageText(),
      // A campaign reference is required for a textPostConfig conversation to create text posts.
      campaign: campaignFactory.getValidCampaign(),
    },
  };
  return data;
}

module.exports = {
  getValidTextPostConfig,
};
