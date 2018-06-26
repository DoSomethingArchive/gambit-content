'use strict';

const underscore = require('underscore');

module.exports = function sendResponse() {
  return (req, res) => {
    const dataByCampaignId = {};

    // Loop through all changeTopicTriggers to group them by campaign id.
    req.changeTopicTriggers.forEach((defaultTopicTrigger) => {
      const topic = defaultTopicTrigger.topic;
      const trigger = defaultTopicTrigger.trigger;
      const campaignId = topic.campaign.id;

      if (!dataByCampaignId[campaignId]) {
        dataByCampaignId[campaignId] = {
          campaign: topic.campaign,
          // TODO: This should live inside a topic, not campaign, but for now each campaign
          // only has one topic. Otherwise add topicsById map to return triggers by topic.
          triggers: [defaultTopicTrigger.trigger],
          topics: [topic],
        };
      } else {
        dataByCampaignId[campaignId].topics.push(topic);
        dataByCampaignId[campaignId].triggers.push(trigger);
      }
    });

    const data = Object.keys(dataByCampaignId).map((campaignId) => {
      const formattedCampaign = dataByCampaignId[campaignId].campaign;
      formattedCampaign.topics = dataByCampaignId[campaignId].topics.map((topic) => {
        const formattedTopic = underscore.pick(topic, ['id', 'name', 'postType']);
        formattedTopic.triggers = dataByCampaignId[campaignId].triggers;
        return formattedTopic;
      });
      return formattedCampaign;
    });

    return res.send({ data });
  };
};
