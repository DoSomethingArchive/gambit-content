'use strict';

const contentful = require('../../contentful');
const helpers = require('../../helpers');

module.exports = function getKeywords() {
  return (req, res, next) => {
    contentful.fetchKeywordsForCampaignId(req.campaignId)
      .then((contentfulRes) => {
        req.campaign.keywords = contentfulRes;
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
