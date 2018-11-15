'use strict';

const helpers = require('../../../helpers');

module.exports = function getCampaign() {
  return (req, res) => {
    req.campaignId = Number(req.params.campaignId);
    const resetCache = helpers.request.isCacheReset(req);

    return helpers.campaign.getById(req.campaignId, resetCache)
      .then((campaign) => {
        req.campaign = campaign;
        return helpers.campaign.getCampaignConfigByCampaignId(req.campaignId, resetCache);
      })
      .then((campaignConfig) => {
        req.campaign.config = campaignConfig;
        return res.send({ data: req.campaign });
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
