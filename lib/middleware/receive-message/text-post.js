'use strict';

const logger = require('winston');
const helpers = require('../../helpers');
const replies = require('../../replies');

module.exports = function textPost() {
  return (req, res, next) => {
    if (!helpers.request.isTextPost(req)) {
      return next();
    }

    // TODO: Send a new askText reply, sending askCaption for now.
    if (helpers.request.shouldAskNextQuestion(req)) {
      return replies.askCaption(req, res);
    }

    // TODO: Send a new invalidText reply, sending invalidCaption for now.
    if (!helpers.request.isValidReportbackText(req)) {
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
