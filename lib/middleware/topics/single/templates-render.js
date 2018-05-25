'use strict';

const helpers = require('../../../helpers');

module.exports = function formatResponse() {
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
        postType: req.topic.postType,
        campaign: {
          id: req.campaign.id,
          title: req.campaign.title,
          tagline: req.campaign.tagline,
          currentCampaignRun: req.campaign.currentCampaignRun,
          status: req.campaign.status,
        },
        defaultTopicTriggers: req.topic.defaultTopicTriggers,
      };
      Object.assign(data, req.topic);
      delete data.campaignId;
      data.templates = templates;
      return res.send({ data: req.topic });
    } catch (err) {
      return helpers.sendErrorResponse(res, err);
    }
  };
};
