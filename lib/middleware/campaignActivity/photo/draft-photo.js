'use strict';

const helpers = require('../../../helpers');
const replies = require('../../../replies');

module.exports = function draftSubmissionPhoto() {
  return (req, res, next) => {
    if (helpers.request.hasDraftWithPhoto(req)) {
      return next();
    }

    if (req.askNextQuestion) {
      return replies.askPhoto(req, res);
    }

    if (!helpers.request.getMessagePhotoUrl(req)) {
      return replies.noPhotoSent(req, res);
    }

    return helpers.campaignActivity.saveDraftPhotoFromReq(req)
      .then(() => replies.askCaption(req, res))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
