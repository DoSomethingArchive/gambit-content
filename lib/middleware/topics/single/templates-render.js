'use strict';

const helpers = require('../../../helpers');

module.exports = function formatResponse() {
  return (req, res) => {
    try {
      return res.send({ data: req.topic });
    } catch (err) {
      return helpers.sendErrorResponse(res, err);
    }
  };
};
