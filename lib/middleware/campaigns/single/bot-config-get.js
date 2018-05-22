'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopics() {
  return (req, res, next) => helpers.topic.fetchTopicsByCampaignId(req.campaignId)
    .then((topics) => {
      req.topics = topics;

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
