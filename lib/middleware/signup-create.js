'use strict';

const helpers = require('../helpers');

const Signup = require('../../app/models/Signup.js');

module.exports = function createNewSignup() {
  return (req, res, next) => {
    if (req.signup) {
      return next();
    }
    return Signup.createSignupForReq(req)
      .then((signup) => {
        helpers.handleTimeout(req, res);
        req.signup = signup;

        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
