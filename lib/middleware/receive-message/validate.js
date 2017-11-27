'use strict';

const logger = require('winston');
const newrelic = require('newrelic');
const underscore = require('underscore');

const helpers = require('../../helpers');

function validateSignup(req, res) {
  if (!req.signup) {
    helpers.sendResponse(res, 500, 'req.signup is undefined');
    return false;
  }

  logger.verbose(`userId:${req.userId} campaignId:${req.campaign.id} signupId:${req.signup._id}`);
  newrelic.addCustomParameters({ signupId: req.signup._id });
  return true;
}

module.exports = function validateRequest() {
  return (req, res, next) => {
    const validations = [];

    // validations
    validations.push(validateSignup(req, res));

    // check if all passed
    const passedValidations = underscore.every(validations, valid => valid);

    // if all passed, call next
    if (passedValidations) {
      next();
    }
  };
};
