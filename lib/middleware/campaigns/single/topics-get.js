'use strict';

const logger = require('winston');
const helpers = require('../../../helpers');

module.exports = function getTopics() {
  return (req, res, next) => helpers.defaultTopicTrigger.getAll()
    .then((defaultTopicTriggers) => {
      // Find all defaultTopicTriggers that change to a topic for this campaign.
      const changeTopicTriggersForThisCampaign = defaultTopicTriggers.filter((trigger) => {
        logger.debug('getTopics', { trigger });
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

      // Return array of current topics (which include an array of triggers).
      req.topics = Object.keys(topicsById).map(topicId => topicsById[topicId]);

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
