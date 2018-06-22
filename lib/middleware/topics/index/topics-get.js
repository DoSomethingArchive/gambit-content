'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopics() {
  return (req, res) => helpers.topic.getAll()
    .then((topics) => {
      req.data = topics;
      const promises = topics.map(topic => helpers.defaultTopicTrigger.getByTopicId(topic.id));
      return Promise.all(promises);
    })
    .then((defaultTopicTriggersByTopic) => {
      defaultTopicTriggersByTopic.forEach((result, index) => {
        req.data[index].triggers = helpers.defaultTopicTrigger
          .getTriggersFromDefaultTopicTriggers(result);
      });
      return res.send({ data: req.data });
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
