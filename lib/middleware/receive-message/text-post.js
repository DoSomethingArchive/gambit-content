'use strict';

const helpers = require('../../helpers');
const replies = require('../../replies');

module.exports = function textPost() {
  return (req, res, next) => {
    if (!helpers.request.isTextPost(req)) {
      return next();
    }
    return replies.menuCompleted(req, res);
  };
};
