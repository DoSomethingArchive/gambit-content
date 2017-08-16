'use strict';

module.exports = function receiveMessage() {
  return (req, res, next) => {
    req.campaignId = req.body.campaignId;

    return next();
  };
};
