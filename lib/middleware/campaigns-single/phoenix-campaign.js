'use strict';

const helpers = require('../../helpers');

module.exports = function getPhoenixCampaign() {
  return (req, res, next) => {
    req.campaignId = req.params.campaignId;

    return helpers.campaign.getById(req.campaignId)
      .then((phoenixRes) => {
        req.campaign = phoenixRes;
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
