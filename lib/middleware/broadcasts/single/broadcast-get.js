'use strict';

const helpers = require('../../../helpers');

module.exports = function getBroadcast() {
  return (req, res) => helpers.broadcast.getById(req.params.broadcastId)
    .then((broadcast) => {
      req.data = broadcast;
      return res.send({ data: req.data });
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
