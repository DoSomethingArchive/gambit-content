'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopics() {
  return (req, res) => helpers.topic.fetchAll()
    .then(data => res.send({ data }))
    .catch(err => helpers.sendErrorResponse(res, err));
};
