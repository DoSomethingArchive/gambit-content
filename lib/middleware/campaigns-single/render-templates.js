'use strict';

const helpers = require('../../helpers');

module.exports = function getTemplates() {
  return (req, res) => {
    const templateNames = helpers.botConfig.getTemplateNames();
    const templatesObj = {};
    templateNames.forEach((templateName) => {
      const template = helpers.botConfig.getTemplateDataFromBotConfig(req.botConfig, templateName);
      template.rendered = helpers.replacePhoenixCampaignVars(template.raw, req.campaign);
      templatesObj[templateName] = template;
    });
    req.campaign.botConfig.templates = templatesObj;
    // Adding this for backwards-compatability.
    // TODO: remove this property once we make change on Conversations side to inspect botConfig.
    req.campaign.templates = req.campaign.botConfig.templatesObj;

    return res.send({ data: req.campaign });
  };
};
