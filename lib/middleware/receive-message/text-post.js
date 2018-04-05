'use strict';

const logger = require('winston');
const helpers = require('../../helpers');
const replies = require('../../replies');

module.exports = function textPost() {
  return (req, res, next) => {
    if (!helpers.request.isTextPost(req)) {
      return next();
    }

    return helpers.campaignActivity.createTextPostFromReq(req)
      .then((textPostRes) => {
        logger.debug('textPost response', textPostRes);
        return replies.menuCompleted(req, res);
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
