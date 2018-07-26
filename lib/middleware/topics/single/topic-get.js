'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopic() {
  // TODO: Use helpers.topic.getById once the new broadcast content types have been added as topic
  // content types. This is a hack to support saving new broadcasts as conversation topics.
  return (req, res) => helpers.contentfulEntry.getById(req.params.topicId)
    .then((topic) => {
      req.data = topic;
      return helpers.defaultTopicTrigger.getByTopicId(topic.id);
    })
    .then((defaultTopicTriggers) => {
      req.data.triggers = helpers.defaultTopicTrigger
        .getTriggersFromDefaultTopicTriggers(defaultTopicTriggers);
      return helpers.response.sendData(res, req.data);
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
