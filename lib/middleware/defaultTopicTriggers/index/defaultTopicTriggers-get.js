'use strict';

const helpers = require('../../../helpers');

module.exports = function getDefaultTopicTriggers() {
  return (req, res) => {
    let promise;
    if (req.query && req.query.cache === 'false') {
      promise = helpers.defaultTopicTrigger.fetch(req.query);
    } else {
      promise = helpers.defaultTopicTrigger.getAll();
    }
    return promise
      .then(defaultTopicTriggers => helpers.response.sendIndexData(res, defaultTopicTriggers))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
