'use strict';

const helpers = require('../helpers');
const Signup = require('../../app/models/Signup.js');

module.exports = function getSignup() {
  return (req, res, next) => {
    const campaign = req.campaign;
    return Signup.lookupCurrent(req.userId, campaign)
      .then((signup) => {
        helpers.handleTimeout(req, res);

        if (signup) {
          req.signup = signup; // eslint-disable-line no-param-reassign
          req.draftSubmission = req.signup.draft_reportback_submission;
        }

        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
