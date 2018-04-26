'use strict';

const logger = require('winston');
const helpers = require('../../../helpers');
const replies = require('../../../replies');

module.exports = function textPost() {
  return (req, res, next) => {
    if (!helpers.request.isTextPost(req)) {
      return next();
    }

    if (helpers.request.isKeyword(req)) {
      return replies.askText(req, res);
    }

    if (!helpers.request.isValidReportbackText(req)) {
      return replies.invalidText(req, res);
    }

    return helpers.campaignActivity.createTextPostFromReq(req)
      .then((textPostRes) => {
        logger.debug('createTextPostFromReq response', textPostRes);
        return replies.completedTextPost(req, res);
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
