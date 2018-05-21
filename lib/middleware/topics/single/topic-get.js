'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopic() {
  return (req, res, next) => helpers.topic.getById(req.params.topicId)
    .then((topic) => {
      req.topic = topic;
      req.campaignId = topic.campaignId;
      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
