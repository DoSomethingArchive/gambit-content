'use strict';

const underscore = require('underscore');

module.exports = function sendResponse() {
  return (req, res) => {
    const campaignsById = {};

    // Loop through all changeTopicTriggers to group them by campaign id.
    req.changeTopicTriggers.forEach((defaultTopicTrigger) => {
      const topic = defaultTopicTrigger.topic;
      const trigger = defaultTopicTrigger.trigger;
      const campaignId = topic.campaign.id;

      if (!campaignsById[campaignId]) {
        campaignsById[campaignId] = {
          data: topic.campaign,
          // TODO: This should live inside a topic, not campaign, but for now each campaign
          // only has one topic. Otherwise add topicsById map to return triggers by topic.
          triggers: [defaultTopicTrigger.trigger],
          topics: [topic],
        };
      } else {
        campaignsById[campaignId].topics.push(topic);
        campaignsById[campaignId].triggers.push(trigger);
      }
    });

    const data = Object.keys(campaignsById).map((campaignId) => {
      const campaign = campaignsById[campaignId].data;
      campaign.topics = campaignsById[campaignId].topics.map((topic) => {
        const formattedTopic = underscore.pick(topic, ['id', 'name', 'postType']);
        formattedTopic.triggers = campaignsById[campaignId].triggers;
        return formattedTopic;
      });
      return campaign;
    });

    return res.send({ data });
  };
};
