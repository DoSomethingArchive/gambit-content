'use strict';

const helpers = require('../../helpers');
const Signup = require('../../../app/models/Signup.js');

module.exports = function getSignup() {
  return (req, res, next) => Signup.lookupByUserIdAndCampaignId(req.userId, req.campaignId)
    .then((signup) => {
      helpers.handleTimeout(req, res);

      if (signup) {
        helpers.request.setSignup(req, signup);
        helpers.request.setDraftSubmission(req, signup.draft_reportback_submission);
      }

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
