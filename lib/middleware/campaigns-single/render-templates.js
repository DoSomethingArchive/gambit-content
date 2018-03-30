'use strict';

const helpers = require('../../helpers');

module.exports = function getTemplates() {
  return (req, res) => {
    const templateNames = helpers.botConfig.getTemplateNames();
    const templatesObj = {};
    templateNames.forEach((name) => {
      templatesObj[name] = helpers.botConfig.getTemplateFromBotConfig(req.botConfig, name);
    });
    req.campaign.botConfig.templates = templatesObj;
    // Adding this for backwards-compatability.
    // TODO: remove this property once we make change on Conversations side to inspect botConfig.
    req.campaign.templates = req.campaign.botConfig.templates;

    return res.send({ data: req.campaign });
  };
};
