'use strict';

const helpers = require('../../../helpers');

module.exports = function getCampaign() {
  return (req, res, next) => {
    req.campaignId = req.params.campaignId;

    return helpers.campaign.getById(req.campaignId)
      .then((campaign) => {
        req.campaign = campaign;

        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
