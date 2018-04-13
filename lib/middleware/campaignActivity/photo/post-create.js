'use strict';

const helpers = require('../../../helpers');
const replies = require('../../../replies');

module.exports = function postDraftSubmission() {
  return (req, res) => {
    req.signup.createPostForReq(req)
      .then(() => {
        helpers.handleTimeout(req, res);

        return replies.photoPostCompleted(req, res);
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
