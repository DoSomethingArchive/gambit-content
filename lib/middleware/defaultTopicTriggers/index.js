'use strict';

const helpers = require('../../helpers');

module.exports = function getDefaultTopicTriggers() {
  return (req, res) => helpers.defaultTopicTrigger.fetchAll()
    .then(data => res.send({ data }))
    .catch(err => helpers.sendErrorResponse(res, err));
};
