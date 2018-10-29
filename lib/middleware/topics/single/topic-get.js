'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopic() {
  return (req, res) => helpers.topic.getById(req.params.topicId, helpers.request.isCacheReset(req))
    .then(topic => helpers.response.sendData(res, topic))
    .catch(err => helpers.sendErrorResponse(res, err));
};
