'use strict';

const helpers = require('../../../helpers');

module.exports = function getDefaultTopicTriggers() {
  return (req, res) => helpers.defaultTopicTrigger.getAll()
    .then(defaultTopicTriggers => helpers.response.sendIndexData(res, defaultTopicTriggers))
    .catch(err => helpers.sendErrorResponse(res, err));
};
