'use strict';

const helpers = require('../../../helpers');
const replies = require('../../../replies');

module.exports = function draftQuantity() {
  return (req, res, next) => {
    if (helpers.request.hasDraftWithQuantity(req)) {
      return next();
    }

    if (helpers.request.shouldAskNextQuestion(req)) {
      return replies.askQuantity(req, res);
    }

    if (!helpers.request.isValidReportbackQuantity(req)) {
      return replies.invalidQuantity(req, res);
    }

    return helpers.campaignActivity.saveDraftQuantityFromReq(req)
      .then(() => replies.askPhoto(req, res))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
