'use strict';

class CampaignClosedError extends Error {

  constructor(phoenixCampaign) {
    super();
    this.message = `Campaign ${phoenixCampaign.id} is closed.`;
  }

}

module.exports = CampaignClosedError;
