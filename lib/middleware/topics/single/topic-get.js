'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopic() {
  return (req, res) => helpers.topic.getById(req.params.topicId)
    .then(data => res.send({ data }))
    .catch(err => helpers.sendErrorResponse(res, err));
};
