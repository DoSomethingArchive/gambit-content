'use strict';

const helpers = require('../../../helpers');
const replies = require('../../../replies');

module.exports = function externalPost() {
  return (req, res, next) => {
    if (!helpers.request.isExternalPost(req)) {
      return next();
    }

    if (req.keyword) {
      return replies.startExternalPost(req, res);
    }

    return replies.startExternalPostAutoReply(req, res);
  };
};
