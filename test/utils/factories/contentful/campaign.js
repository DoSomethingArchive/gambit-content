'use strict';

const stubs = require('../../stubs');

/**
 * NOTE: The Gambit Contentful space (confusingly?) has a content type called campaign, used as a
 * reference to link topics to a Phoenix campaign (via the campaignId text field).
 */
function getValidCampaign() {
  return {
    sys: stubs.contentful.getSysWithTypeAndDate('campaign'),
    fields: {
      campaignId: stubs.getCampaignId(),
      webSignup: {
        sys: stubs.contentful.getSysWithTypeAndDate('webSignup'),
        fields: {
          text: stubs.getRandomMessageText(),
          attachments: stubs.contentful.getAttachments(),
          topic: {
            sys: stubs.contentful.getSysWithTypeAndDate('textPostConfig'),
          },
        },
      },
    },
  };
}

module.exports = {
  getValidCampaign,
};
