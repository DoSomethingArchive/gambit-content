'use strict';

const phoenix = require('../../phoenix');
const helpers = require('../../helpers');

module.exports = function getPhoenixCampaign() {
  return (req, res, next) => {
    const campaignId = req.params.campaignId;

    return phoenix.fetchCampaign(campaignId)
      .then((phoenixRes) => {
        req.campaign = phoenixRes;
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
