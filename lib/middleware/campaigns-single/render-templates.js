'use strict';

const contentful = require('../../contentful');
const helpers = require('../../helpers');

module.exports = function setCampaignTemplates() {
  return (req, res) => {
    req.campaign.templates = {};
    if (!req.contentfulCampaigns) {
      return res.send({ data: req.campaign });
    }

    const contentfulFields = contentful.getContentfulCampaignFieldsByTemplateName();
    const templateNames = Object.keys(contentfulFields);
    const override = req.contentfulCampaigns.override;

    templateNames.forEach((templateName) => {
      const fieldName = contentfulFields[templateName];
      let template;

      if (override && override.fields[fieldName]) {
        template = {
          override: true,
          raw: override.fields[fieldName],
        };
      } else {
        template = {
          override: false,
          raw: req.contentfulCampaigns.default.fields[fieldName],
        };
      }

      template.rendered = helpers.replacePhoenixCampaignVars(template.raw, req.campaign);
      req.campaign.templates[templateName] = template;
    });

    return res.send({ data: req.campaign });
  };
};
