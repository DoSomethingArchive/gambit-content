'use strict';

const contentful = require('../../contentful');
const helpers = require('../../helpers');

module.exports = function getTemplates() {
  return (req, res) => {
    contentful.fetchTemplatesForCampaignId(req.campaign.id)
      .then((contentfulRes) => {
        req.campaign.templates = contentfulRes;
        return res.send({ data: req.campaign });
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
