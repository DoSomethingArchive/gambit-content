'use strict';

const helpers = require('../../../helpers');
const replies = require('../../../replies');

module.exports = function autoReply() {
  return (req, res, next) => {
    try {
      if (helpers.request.hasDraftSubmission(req)) {
        return next();
      }
      const hasSubmittedPost = helpers.request.hasSubmittedPhotoPost(req);
      if (req.askNextQuestion) {
        if (hasSubmittedPost) {
          return replies.photoPostCompleted(req, res);
        }
        return replies.startPhotoPost(req, res);
      }
      if (hasSubmittedPost) {
        return replies.photoPostCompletedAutoReply(req, res);
      }
      return replies.startPhotoPostAutoReply(req, res);
    } catch (err) {
      return helpers.sendErrorResponse(res, err);
    }
  };
};
