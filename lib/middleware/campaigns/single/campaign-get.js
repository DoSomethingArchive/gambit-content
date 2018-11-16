'use strict';

const helpers = require('../../../helpers');

module.exports = function getCampaign() {
  return async (req, res) => {
    try {
      const id = Number(req.params.campaignId);
      const resetCache = helpers.request.isCacheReset(req);
      const campaign = await helpers.campaign.getById(id, resetCache);
      const campaignConfig = await helpers.campaign.getCampaignConfigByCampaignId(id, resetCache);

      return helpers.response.sendData(Object.assign(campaign, { config: campaignConfig }));
    } catch (error) {
      return helpers.sendErrorResponse(res, error);
    }
  };
};
