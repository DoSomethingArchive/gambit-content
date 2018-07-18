'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopics() {
  return (req, res) => helpers.topic.fetch(req.query)
    .then((fetchTopicResult) => {
      req.meta = fetchTopicResult.meta;
      req.data = fetchTopicResult.data;
      const promises = req.data.map(topic => helpers.defaultTopicTrigger.getByTopicId(topic.id));
      return Promise.all(promises);
    })
    .then((defaultTopicTriggersByTopic) => {
      defaultTopicTriggersByTopic.forEach((result, index) => {
        req.data[index].triggers = helpers.defaultTopicTrigger
          .getTriggersFromDefaultTopicTriggers(result);
      });
      return res.send({ meta: req.meta, data: req.data });
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
