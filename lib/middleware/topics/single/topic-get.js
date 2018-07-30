'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopic() {
  return (req, res) => {
    const topicId = req.params.topicId;
    return helpers.topic.getById(topicId, helpers.request.isCacheReset(req))
      .then((topic) => {
        req.data = topic;
        return helpers.defaultTopicTrigger.getByTopicId(topicId);
      })
      .then((defaultTopicTriggers) => {
        req.data.triggers = helpers.defaultTopicTrigger
          .getTriggersFromDefaultTopicTriggers(defaultTopicTriggers);
        return helpers.response.sendData(res, req.data);
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
