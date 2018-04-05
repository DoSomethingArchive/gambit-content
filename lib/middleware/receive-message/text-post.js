'use strict';

const logger = require('winston');
const helpers = require('../../helpers');
const replies = require('../../replies');

module.exports = function textPost() {
  return (req, res, next) => {
    if (!helpers.request.isTextPost(req)) {
      return next();
    }

    if (helpers.request.isKeyword(req)) {
      // TODO: Send a new askText reply, sending askCaption for now.
      return replies.askCaption(req, res);
    }

    if (!helpers.request.isValidReportbackText(req)) {
      // TODO: Send a new invalidText reply.
      return replies.invalidCaption(req, res);
    }

    return helpers.campaignActivity.createTextPostFromReq(req)
      .then((textPostRes) => {
        logger.debug('createTextPostFromReq response', textPostRes);
        return replies.menuCompleted(req, res);
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
