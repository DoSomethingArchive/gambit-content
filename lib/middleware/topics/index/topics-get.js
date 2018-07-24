'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopics() {
  return (req, res) => helpers.topic.fetch(req.query)
    .then((fetchTopicResult) => {
      req.data = fetchTopicResult.data;
      req.meta = fetchTopicResult.meta;
      const promises = req.data.map(topic => helpers.defaultTopicTrigger.getByTopicId(topic.id));
      return Promise.all(promises);
    })
    .then((defaultTopicTriggersByTopic) => {
      defaultTopicTriggersByTopic.forEach((result, index) => {
        req.data[index].triggers = helpers.defaultTopicTrigger
          .getTriggersFromDefaultTopicTriggers(result);
      });
      return helpers.response.sendIndexData(res, req.data, req.meta);
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
