'use strict';

const stubs = require('../../stubs');

/**
 * @see https://github.com/DoSomething/rogue/blob/master/docs/endpoints/campaigns.md
 */
function getValidCampaign(endDate = null) {
  return {
    id: stubs.getCampaignId(),
    internal_title: stubs.getRandomMessageText(),
    start_date: '2018-03-29 00:00:00.000000',
    end_date: endDate,
  };
}

function getValidClosedCampaign() {
  return getValidCampaign('2018-04-29 00:00:00.000000');
}

module.exports = {
  getValidCampaign,
  getValidClosedCampaign,
};
