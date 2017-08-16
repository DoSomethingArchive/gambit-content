'use strict';

const helpers = require('../helpers');
const ReplyDispatcher = require('../conversation/reply-dispatcher');
const replies = require('../conversation/replies');

module.exports = function postDraftSubmission() {
  return (req, res) => {
    req.signup.postDraftReportbackSubmission()
      .then(() => {
        helpers.handleTimeout(req, res);

        return ReplyDispatcher.execute(replies.menuCompleted({ req, res }));
      })
      .catch(err => helpers.handlePhoenixPostError(req, res, err));
  };
};
