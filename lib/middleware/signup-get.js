'use strict';

const helpers = require('../helpers');
const Signup = require('../../app/models/Signup.js');

module.exports = function getCampaign() {
  return (req, res, next) => {
    const user = req.user;
    const campaign = req.campaign;
    return Signup.lookupCurrent(user, campaign)
      .then((signup) => {
        helpers.handleTimeout(req, res);

        if (signup) {
          req.signup = signup; // eslint-disable-line no-param-reassign
        }

        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
