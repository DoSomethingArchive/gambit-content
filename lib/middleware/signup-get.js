'use strict';

const helpers = require('../helpers');
const Signup = require('../../app/models/Signup.js');

module.exports = function getSignup() {
  return (req, res, next) => {
    Signup.lookupCurrent(req.userId, req.campaignId)
      .then((signup) => {
        helpers.handleTimeout(req, res);

        if (signup) {
          req.signup = signup;
          req.draftSubmission = req.signup.draft_reportback_submission;
        }

        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
