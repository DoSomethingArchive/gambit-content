'use strict';

const helpers = require('../../../helpers');

module.exports = function getAllDefaultTopicTriggersWithCampaignTopics() {
  return (req, res, next) => helpers.defaultTopicTrigger.getAllWithCampaignTopics()
    .then((defaultTopicTriggers) => {
      req.changeTopicTriggers = defaultTopicTriggers;
      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
