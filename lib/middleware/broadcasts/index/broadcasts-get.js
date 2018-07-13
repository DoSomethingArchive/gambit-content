'use strict';

const helpers = require('../../../helpers');

module.exports = function getBroadcasts() {
  return (req, res) => helpers.broadcast.fetchAll()
    .then((broadcasts) => {
      req.data = broadcasts;
      return res.send({ data: req.data });
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
