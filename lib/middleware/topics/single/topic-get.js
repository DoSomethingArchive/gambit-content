'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopic() {
  return (req, res) => helpers.topic.getById(req.params.topicId)
    .then((topic) => {
      req.data = topic;
      return helpers.defaultTopicTrigger.getByTopicId(topic.id);
    })
    .then((defaultTopicTriggersForThisTopic) => {
      req.data.triggers = defaultTopicTriggersForThisTopic
        .map(defaultTopicTrigger => defaultTopicTrigger.trigger);
      return res.send({ data: req.data });
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
