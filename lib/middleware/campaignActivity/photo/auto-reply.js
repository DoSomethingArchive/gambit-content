'use strict';

const helpers = require('../../../helpers');
const replies = require('../../../replies');

module.exports = function autoReply() {
  return (req, res, next) => {
    if (req.draftSubmission) {
      return next();
    }

    const hasSubmittedPost = helpers.request.hasSubmittedPhotoPost(req);

    if (req.askNextQuestion) {
      if (hasSubmittedPost) {
        return replies.photoPostCompleted(req, res);
      }
      return replies.signupConfirmed(req, res);
    }

    if (hasSubmittedPost) {
      return replies.photoPostCompletedAutoReply(req, res);
    }

    return replies.signupConfirmedAutoReply(req, res);
  };
};
