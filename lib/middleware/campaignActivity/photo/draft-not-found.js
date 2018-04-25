'use strict';

const helpers = require('../../../helpers');
const replies = require('../../../replies');

module.exports = function draftSubmissionNotFound() {
  return (req, res, next) => {
    try {
      if (helpers.request.hasDraftSubmission(req)) {
        return next();
      }

      if (helpers.request.isStartCommand(req)) {
        return req.signup.createDraftReportbackSubmission()
          .then(() => replies.askQuantity(req, res))
          .catch(err => helpers.sendErrorResponse(res, err));
      }

      const hasSubmittedPost = helpers.request.hasSubmittedPhotoPost(req);

      if (req.askNextQuestion) {
        if (hasSubmittedPost) {
          return replies.completedPhotoPost(req, res);
        }
        return replies.startPhotoPost(req, res);
      }

      if (hasSubmittedPost) {
        return replies.completedPhotoPostAutoReply(req, res);
      }

      return replies.startPhotoPostAutoReply(req, res);
    } catch (err) {
      return helpers.sendErrorResponse(res, err);
    }
  };
};
