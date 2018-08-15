'use strict';

const stubs = require('../../stubs');

/**
 * NOTE: The Gambit Contentful space (confusingly?) has a content type called campaign, used as a
 * reference to link topics to a Phoenix campaign (via the campaignId text field).
 */
function getValidCampaign() {
  const data = {
    sys: stubs.contentful.getSysWithTypeAndDate('campaign'),
    fields: {
      campaignId: stubs.getCampaignId(),
    },
  };
  return data;
}

module.exports = {
  getValidCampaign,
};
