'use strict';

const helpers = require('../../../helpers');

// NOTE: This will be deprecated for the sake of leaving it up to Gambit Admin to make multiple
// queries (or integrating these endpoints into GraphQL) for the sake of grouping topics by campaign

module.exports = function getTopics() {
  return (req, res, next) => helpers.defaultTopicTrigger.getAll()
    .then((defaultTopicTriggers) => {
      // Find all defaultTopicTriggers that change to a topic for this campaign.
      const changeTopicTriggersForThisCampaign = defaultTopicTriggers.filter((trigger) => {
        const isCampaignTopicTrigger = trigger && trigger.topic && trigger.topic.campaign;
        return isCampaignTopicTrigger && trigger.topic.campaign.id === req.campaignId;
      });

      // Loop through the campaign changeTopic triggers to find all current topics.
      const topicsById = {};
      changeTopicTriggersForThisCampaign.forEach((changeTopicTrigger) => {
        const topicId = changeTopicTrigger.topic.id;
        if (!topicsById[topicId]) {
          topicsById[topicId] = changeTopicTrigger.topic;
          topicsById[topicId].triggers = [changeTopicTrigger.trigger];
        } else {
          topicsById[topicId].triggers.push(changeTopicTrigger.trigger);
        }
      });

      req.topics = Object.values(topicsById);

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
