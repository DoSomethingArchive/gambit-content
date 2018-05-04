'use strict';

const helpers = require('../../../helpers');
const replies = require('../../../replies');

module.exports = function draftWhyParticipated() {
  return (req, res, next) => {
    // Only collected during user's first photo post for a campaign.
    if (helpers.request.hasSubmittedPhotoPost(req)) {
      return next();
    }

    if (helpers.request.shouldAskNextQuestion(req)) {
      return replies.askWhyParticipated(req, res);
    }

    if (!helpers.request.isValidReportbackText(req)) {
      return replies.invalidWhyParticipated(req, res);
    }

    return helpers.campaignActivity.saveDraftWhyParticipatedFromReq(req)
      .then(() => next())
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
