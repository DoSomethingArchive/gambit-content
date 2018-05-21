'use strict';

const helpers = require('../../../helpers');

module.exports = function parseBotConfig() {
  return (req, res) => {
    try {
      const templates = req.topic.templates;
      const templateNames = Object.keys(templates);
      templateNames.forEach((templateName) => {
        const template = templates[templateName];
        template.rendered = helpers.replacePhoenixCampaignVars(template.raw, req.campaign);
      });
      const data = {
        id: req.params.topicId,
        type: req.topic.type,
        campaign: {
          id: req.campaign.id,
          title: req.campaign.title,
          tagline: req.campaign.tagline,
        },
      };
      Object.assign(data, req.topic);
      delete data.campaignId;
      data.templates = templates;
      console.log(data);
      return res.send({ data });
    } catch (err) {
      return helpers.sendErrorResponse(res, err);
    }
  };
};
