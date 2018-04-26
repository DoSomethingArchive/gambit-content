'use strict';

const helpers = require('../../helpers');
const Signup = require('../../../app/models/Signup.js');

module.exports = function getSignup() {
  return (req, res, next) => { // eslint-disable-line arrow-body-style
    // TODO: Our middleware test fails with 'helpers.sendErrorResponse.should.have.been.called' if
    // we don't explicitly use return here.
    return Signup.lookupCurrentSignupForReq(req)
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
};
