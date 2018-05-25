'use strict';

const helpers = require('../../../helpers');

module.exports = function sendResponse() {
  return (req, res) => {
    try {
      // Remove campaign properties since this list of topics is nested within a campaign response.
      req.topics.forEach((topic) => {
        const nestedTopic = topic;
        delete nestedTopic.campaign;
        return nestedTopic;
      });
      req.campaign.topics = req.topics;
      // TODO: Remove setting this botConfig property once Conversations starts inspecting
      // topics property instead of botConfig.
      // @see https://github.com/DoSomething/gambit-conversations/blob/2.6.1/lib/gambit-campaigns.js#L133
      const firstTopic = req.topics[0];
      req.campaign.botConfig = {
        postType: firstTopic ? firstTopic.postType : null,
        templates: firstTopic ? firstTopic.templates : null,
      };
    } catch (err) {
      return helpers.sendErrorResponse(res, err);
    }

    return res.send({ data: req.campaign });
  };
};
