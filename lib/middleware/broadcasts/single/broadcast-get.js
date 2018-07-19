'use strict';

const helpers = require('../../../helpers');

module.exports = function getBroadcast() {
  return (req, res) => helpers.broadcast.getById(req.params.broadcastId)
    .then(broadcast => helpers.response.sendData(res, broadcast))
    .catch(err => helpers.sendErrorResponse(res, err));
};
