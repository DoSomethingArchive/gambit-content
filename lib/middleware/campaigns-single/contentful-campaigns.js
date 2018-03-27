'use strict';

const contentful = require('../../contentful');
const helpers = require('../../helpers');

module.exports = function getContentfulCampaigns() {
  return (req, res, next) => {
    const campaignId = req.campaignId;
    return contentful.fetchDefaultAndOverrideCampaignsForCampaignId(campaignId)
      .then((contentfulCampaigns) => {
        req.contentfulCampaigns = contentfulCampaigns;
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
