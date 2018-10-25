'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopics() {
  return (req, res) => helpers.topic.fetch(req.query)
    .then((fetchTopicResult) => {
      req.data = fetchTopicResult.data;
      req.meta = fetchTopicResult.meta;
      return helpers.response.sendIndexData(res, req.data, req.meta);
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
