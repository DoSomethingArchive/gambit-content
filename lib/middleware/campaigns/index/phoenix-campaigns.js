'use strict';

const helpers = require('../../../helpers');

module.exports = function getPhoenixCampaigns() {
  return (req, res, next) => {
    const campaignIds = Object.keys(req.keywordsByCampaignId);

    return helpers.campaign.fetchByIds(campaignIds)
      .then((phoenixRes) => {
        req.phoenixCampaigns = phoenixRes;
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
