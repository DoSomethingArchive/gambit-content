'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopics() {
  return (req, res) => helpers.topic.getAll()
    .then(data => res.send({ data }))
    .catch(err => helpers.sendErrorResponse(res, err));
};
