'use strict';

const stubs = require('../../stubs');

/**
 * @see https://github.com/DoSomething/rogue/blob/master/docs/endpoints/campaigns.md
 */
function getValidCampaign() {
  return {
    id: stubs.getCampaignId(),
    internal_title: stubs.getRandomMessageText(),
    start_date: '2018-03-29 00:00:00.000000',
    end_date: null,
  };
}

module.exports = {
  getValidCampaign,
};
