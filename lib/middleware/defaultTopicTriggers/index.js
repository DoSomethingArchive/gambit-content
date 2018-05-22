'use strict';

const helpers = require('../../helpers');

module.exports = function getDefaultTopicTriggers() {
  return (req, res) => helpers.topic.fetchDefaultTopicTriggers()
    .then(data => res.send({ data }))
    .catch(err => helpers.sendErrorResponse(res, err));
};
