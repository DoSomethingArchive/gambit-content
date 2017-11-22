'use strict';

const replies = require('../replies');

module.exports = function doingMenu() {
  return (req, res, next) => {
    if (req.draftSubmission) {
      return next();
    }

    if (req.isNewConversation) {
      return replies.menuSignedUp(req, res);
    }

    return replies.invalidCmdSignedup(req, res);
  };
};
