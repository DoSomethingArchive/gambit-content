'use strict';

const helpers = require('../../helpers');

module.exports = function getTemplates() {
  return (req, res) => {
    const templateNames = helpers.botConfig.getTemplateNames();
    const templates = {};
    templateNames.forEach((templateName) => {
      const templateObj = helpers.botConfig.getTemplateFromBotConfig(req.botConfig, templateName);
      templateObj.rendered = helpers.replacePhoenixCampaignVars(templateObj.raw, req.campaign);
      templates[templateName] = templateObj;
    });
    req.campaign.botConfig.templates = templates;
    // Adding this for backwards-compatability.
    // TODO: remove this property once we make change on Conversations side to inspect botConfig.
    req.campaign.templates = req.campaign.botConfig.templates;

    return res.send({ data: req.campaign });
  };
};
