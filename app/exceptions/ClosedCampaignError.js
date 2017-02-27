'use strict';

class ClosedCampaignError extends Error {

  constructor(phoenixCampaign) {
    super();
    this.message = `Campaign ${phoenixCampaign.id} is closed.`;
  }

}

module.exports = ClosedCampaignError;
