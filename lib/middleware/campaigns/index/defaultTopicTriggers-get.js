'use strict';

const helpers = require('../../../helpers');

module.exports = function getAllDefaultTopicTriggersWithCampaignTopics() {
  return (req, res, next) => helpers.defaultTopicTrigger.getAll()
    .then((defaultTopicTriggers) => {
      req.changeTopicTriggers = defaultTopicTriggers
        .filter(trigger => trigger && trigger.topic && trigger.topic.campaign);
      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
