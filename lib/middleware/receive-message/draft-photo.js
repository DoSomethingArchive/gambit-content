'use strict';

const helpers = require('../../helpers');
const replies = require('../../replies');

module.exports = function draftSubmissionPhoto() {
  return (req, res, next) => {
    if (req.draftSubmission.photo) {
      return next();
    }

    if (req.askNextQuestion) {
      return replies.askPhoto(req, res);
    }

    if (!req.incoming_image_url) {
      return replies.noPhotoSent(req, res);
    }

    req.draftSubmission.photo = req.incoming_image_url;

    return req.draftSubmission.save()
      .then(() => replies.askCaption(req, res))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
