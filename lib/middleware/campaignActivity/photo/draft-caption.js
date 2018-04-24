'use strict';

const helpers = require('../../../helpers');
const replies = require('../../../replies');

module.exports = function draftCaption() {
  return (req, res, next) => {
    if (helpers.request.hasDraftWithCaption(req)) {
      return next();
    }

    if (req.askNextQuestion) {
      return replies.askCaption(req, res);
    }

    if (!helpers.request.isValidReportbackText(req)) {
      return replies.invalidCaption(req, res);
    }

    return helpers.campaignActivity.saveDraftCaptionFromReq(req)
      .then(() => {
        // Ask for why_participated if this is user's first photo post for the campaign.
        if (!helpers.request.hasSubmittedPhotoPost(req)) {
          return replies.askWhyParticipated(req, res);
        }

        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
