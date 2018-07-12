'use strict';

const helpers = require('../../../helpers');

module.exports = function getTopic() {
  return (req, res) => helpers.topic.getById(req.params.broadcastId)
    .then((topic) => {
      req.data = topic;
      return res.send({ data: req.data });
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
