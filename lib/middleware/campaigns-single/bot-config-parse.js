'use strict';

const helpers = require('../../helpers');

module.exports = function parseBotConfig() {
  return (req, res) => {
    try {
      req.campaign.botConfig = {
        postType: helpers.botConfig.parsePostTypeFromBotConfig(req.botConfig),
      };
      const templateNames = helpers.botConfig.getTemplateNames();
      const templatesObj = {};
      templateNames.forEach((templateName) => {
        const data = helpers.botConfig.getTemplateDataFromBotConfig(req.botConfig, templateName);
        data.rendered = helpers.replacePhoenixCampaignVars(data.raw, req.campaign);
        templatesObj[templateName] = data;
      });
      req.campaign.botConfig.templates = templatesObj;
      // Adding this for backwards-compatability.
      // TODO: remove this property once we make change on Conversations side to inspect botConfig.
      req.campaign.templates = templatesObj;
    } catch (err) {
      return helpers.sendErrorResponse(res, err);
    }

    return res.send({ data: req.campaign });
  };
};
