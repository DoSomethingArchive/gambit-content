'use strict';

const helpers = require('../helpers');

const Signup = require('../../app/models/Signup.js');

module.exports = function createNewUser() {
  return (req, res, next) => {
    if (req.signup) {
      return next();
    }
    return Signup.post(req.user, req.campaign, req.keyword, req.broadcast_id)
      .then((signup) => {
        helpers.handleTimeout(req, res);
        req.signup = signup; // eslint-disable-line no-param-reassign

        return next();
      })
      .catch(err => helpers.handlePhoenixPostError(req, res, err));
  };
};
