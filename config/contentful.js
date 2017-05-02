'use strict';

module.exports = {
  clientOptions: {
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  },
  defaultCampaignId: process.env.CONTENTFUL_DEFAULT_CAMPAIGN_ID || 'default',
};
