'use strict';

const stubs = require('../../stubs');

/**
 * @see https://github.com/DoSomething/rogue/blob/master/docs/endpoints/campaigns.md
 */
function getValidCampaign() {
  return {
    id: stubs.getCampaignId(),
    internal_title: stubs.getRandomMessageText(),
    start_date: {
      date: '2018-03-29 00:00:00.000000',
      timezone_type: 3,
      timezone: 'UTC',
    },
    end_date: null,
  };
}

module.exports = {
  getValidCampaign,
};
