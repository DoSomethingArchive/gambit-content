'use strict';

const underscore = require('underscore');
const helpers = require('../helpers');

module.exports = function checkRequestContext(config = {}) {
  return (req, res, next) => {
    const contextFound = underscore.some(Object.keys(config.requestContexts), (name) => {
      const context = req[config.containerProperty][name];
      if (context) {
        req.requestContext = config.requestContexts[name];
      }
      return context;
    });

    if (!contextFound) {
      const msg = `Missing the context of the request. Any of these params: ${Object.keys(config.requestContexts).join(', ')}`;
      return helpers.sendUnproccessibleEntityResponse(res, msg);
    }
    return next();
  };
};
