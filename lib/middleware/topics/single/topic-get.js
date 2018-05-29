'use strict';

const logger = require('winston');
const helpers = require('../../../helpers');

module.exports = function getTopic() {
  return (req, res, next) => helpers.topic.getById(req.params.topicId)
    .then((topic) => {
      logger.debug('topic.getById success', { topicId: req.params.topicId });
      req.topic = topic;
      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
