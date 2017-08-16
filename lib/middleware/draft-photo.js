'use strict';

const helpers = require('../helpers');
const ReplyDispatcher = require('../conversation/reply-dispatcher');
const replies = require('../conversation/replies');

module.exports = function draftSubmissionPhoto() {
  return (req, res, next) => {
    if (req.draftSubmission.photo) {
      return next();
    }

    if (req.isNewConversation) {
      return ReplyDispatcher.execute(replies.askPhoto({ req, res }));
    }

    if (!req.incoming_image_url) {
      return ReplyDispatcher.execute(replies.noPhotoSent({ req, res }));
    }

    req.draftSubmission.photo = req.incoming_image_url;

    return req.draftSubmission.save()
      .then(() => ReplyDispatcher.execute(replies.askCaption({ req, res })))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
