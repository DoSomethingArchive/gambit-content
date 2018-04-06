'use strict';

const helpers = require('../../../helpers');

module.exports = function parseBotConfig() {
  return (req, res) => {
    try {
      req.campaign.botConfig = {
        postType: helpers.botConfig.parsePostTypeFromBotConfig(req.botConfig),
      };
      const templates = helpers.botConfig.getTemplatesFromBotConfig(req.botConfig);
      const templateNames = Object.keys(templates);
      templateNames.forEach((templateName) => {
        const template = templates[templateName];
        template.rendered = helpers.replacePhoenixCampaignVars(template.raw, req.campaign);
      });
      req.campaign.botConfig.templates = templates;
      // Adding this for backwards-compatability.
      // TODO: remove this property once we make change on Conversations side to inspect botConfig.
      req.campaign.templates = templates;
    } catch (err) {
      return helpers.sendErrorResponse(res, err);
    }

    return res.send({ data: req.campaign });
  };
};
