'use strict';

const newrelic = require('newrelic');
const logger = require('winston');
const helpers = require('../helpers');

const User = require('../../app/models/User');

module.exports = function getUser() {
  return (req, res, next) => {
    const phoneNumber = req.body.phone;
    return User.lookup('mobile', phoneNumber)
      .then((user) => {
        helpers.handleTimeout(req, res);
        req.user = user; // eslint-disable-line no-param-reassign
        newrelic.addCustomParameters({ userId: user._id });
        return next();
      })
      .catch((err) => {
        if (err && err.status === 404) {
          helpers.handleTimeout(req, res);
          logger.info(`User.lookup could not find mobile:${phoneNumber}`);
          return next();
        }
        return helpers.sendErrorResponse(res, err);
      });
  };
};
