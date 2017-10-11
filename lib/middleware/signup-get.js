'use strict';

const helpers = require('../helpers');
const Signup = require('../../app/models/Signup.js');

module.exports = function getSignup() {
  return (req, res, next) => {
    const campaignRunId = req.campaign.currentCampaignRun.id;

    return Signup.lookupCurrent(req.userId, campaignRunId)
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
