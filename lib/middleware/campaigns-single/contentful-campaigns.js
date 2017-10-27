'use strict';

const contentful = require('../../contentful');
const helpers = require('../../helpers');

module.exports = function getTemplates() {
  return (req, res, next) => {
    contentful.fetchTemplatesForCampaignId(req.campaign.id)
      .then((contentfulRes) => {
        req.campaign.templates = contentfulRes;
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
