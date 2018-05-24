'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopics() {
  return (req, res, next) => helpers.topic.getByCampaignId(req.campaignId)
    .then((topics) => {
      req.topics = topics;

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
