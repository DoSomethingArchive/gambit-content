'use strict';

const helpers = require('../../../helpers');
const replies = require('../../../replies');

module.exports = function externalPost() {
  return (req, res, next) => {
    try {
      if (!helpers.request.isExternalPost(req)) {
        return next();
      }
      if (req.keyword) {
        return replies.startExternalPost(req, res);
      }
      return replies.startExternalPostAutoReply(req, res);
    } catch (error) {
      return helpers.sendErrorResponse(res, error);
    }
  };
};
