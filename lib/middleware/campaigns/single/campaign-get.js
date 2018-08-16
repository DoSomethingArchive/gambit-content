'use strict';

const helpers = require('../../../helpers');

module.exports = function getCampaign() {
  return (req, res, next) => {
    req.campaignId = Number(req.params.campaignId);
    const resetCache = helpers.request.isCacheReset(req);

    return helpers.campaign.getById(req.campaignId, resetCache)
      .then((campaign) => {
        req.campaign = campaign;
        return helpers.contentfulEntry.fetchCampaignConfigByCampaignId(req.campaignId, resetCache);
      })
      .then((campaignConfig) => {
        req.campaign.config = campaignConfig;
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
