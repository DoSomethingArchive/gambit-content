'use strict';

const underscore = require('underscore');

module.exports = function sendResponse() {
  return (req, res) => {
    const campaignsById = {};
    // Loop through all changeTopicTriggers to group them by campaign id.
    req.changeTopicTriggers.forEach((defaultTopicTrigger) => {
      const topic = defaultTopicTrigger.topic;
      const campaignId = topic.campaign.id;
      if (!campaignsById[campaignId]) {
        campaignsById[campaignId] = {
          data: topic.campaign,
          topics: [topic],
        };
      } else {
        campaignsById[campaignId].topics.push(topic);
      }
    });

    const data = Object.keys(campaignsById).map((campaignId) => {
      const campaign = campaignsById[campaignId].data;
      const topics = campaignsById[campaignId].topics;
      campaign.topics = topics.map(topic => underscore.pick(topic, ['id', 'postType', 'templates']));
      return campaign;
    });

    return res.send({ data });
  };
};
