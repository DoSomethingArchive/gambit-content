'use strict';

const helpers = require('../../helpers');
const reportbackHelper = require('../../helpers/reportback');
const replies = require('../../replies');

module.exports = function draftSubmissionQuantity() {
  return (req, res, next) => {
    if (req.draftSubmission.quantity) {
      return next();
    }

    if (req.askNextQuestion) {
      return replies.askQuantity(req, res);
    }

    // TODO: Round up/down based on remainder on Numeric quantity
    if (!reportbackHelper.isValidQuantity(req.incoming_message)) {
      return replies.invalidQuantity(req, res);
    }

    req.draftSubmission.quantity = Number(req.incoming_message);

    return req.draftSubmission.save()
      .then(() => replies.askPhoto(req, res))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
