'use strict';

const helpers = require('../../../helpers');

module.exports = function sendResponse() {
  return (req, res) => {
    try {
      if (!req.topics) {
        req.campaign.botConfig = null;
        return res.send({ data: req.campaign });
      }
      req.campaign.topics = req.topics;
      // Setting botConfig property will be deprecated in near future once Conversations
      // inspects the campaign.topics property instead of campaign.botConfig.
      const firstTopic = req.topics[0];
      req.campaign.botConfig = {
        postType: firstTopic.postType,
        templates: firstTopic.templates,
      };
    } catch (err) {
      return helpers.sendErrorResponse(res, err);
    }

    return res.send({ data: req.campaign });
  };
};
