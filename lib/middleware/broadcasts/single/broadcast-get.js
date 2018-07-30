'use strict';

const helpers = require('../../../helpers');

module.exports = function getBroadcast() {
  return (req, res) => {
    const resetCache = helpers.request.isCacheReset(req);
    return helpers.broadcast.getById(req.params.broadcastId, resetCache)
      .then(broadcast => helpers.response.sendData(res, broadcast))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
