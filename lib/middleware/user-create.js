'use strict';

const newrelic = require('newrelic');
const helpers = require('../helpers');

const User = require('../../app/models/User');

module.exports = function createNewUser() {
  return (req, res, next) => {
    if (req.user) {
      return next();
    }
    const data = {
      mobile: req.body.phone,
      mobilecommons_id: req.profile_id,
    };
    return User.post(data)
      .then((user) => {
        helpers.handleTimeout(req, res);
        req.user = user; // eslint-disable-line no-param-reassign
        newrelic.addCustomParameters({ userId: user._id });
        return next();
      })
     .catch(err => helpers.sendErrorResponse(res, err));
  };
};
