'use strict';

const helpers = require('../../../helpers');

module.exports = function getBroadcasts() {
  return (req, res) => helpers.broadcast.fetch(req.query.skip)
    .then(fetchResult => res.send({ meta: fetchResult.meta, data: fetchResult.data }))
    .catch(err => helpers.sendErrorResponse(res, err));
};
