'use strict';

const phoenix = require('../../phoenix');
const helpers = require('../../helpers');

module.exports = function getPhoenixCampaigns() {
  return (req, res) => {
    const campaignIds = Object.keys(req.campaigns);

    return phoenix.fetchCampaigns(campaignIds)
      .then(phoenixRes => res.send({ data: phoenixRes }))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
