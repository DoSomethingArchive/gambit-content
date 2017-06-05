'use strict';

const underscore = require('underscore');
const helpers = require('../helpers');

module.exports = function checkRequiredParams(config = {}) {
  return (req, res, next) => {
    let paramNotFound;
    const allRequiredParamsExist = underscore.every(config.requiredParams, (name) => {
      const param = req[config.containerProperty][name];
      if (!param) {
        paramNotFound = name;
      }
      return param;
    });

    if (!allRequiredParamsExist) {
      const msg = `Missing required ${paramNotFound}`;
      return helpers.sendUnproccessibleEntityResponse(res, msg);
    }
    return next();
  };
};
