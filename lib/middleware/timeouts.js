'use strict';

const timeout = require('connect-timeout');

/**
 * Returns number of seconds to use for Gambit timeout setting.
 * @return {number}
 */
function getTimeoutNumSeconds() {
  return Number(process.env.GAMBIT_TIMEOUT_NUM_SECONDS) || 15;
}

/**
 * injectTimeoutString Middleware
 *
 * @param  {object} req  http request object
 * @param  {object} res   http response object
 * @param  {function} next
 */
module.exports.injectTimeoutString = function injectTimeoutString(req, res, next) {
  res.timeoutNumSeconds = getTimeoutNumSeconds();
  next();
};

 // Set respond to false so we can send our own 504 status.
 // Note: Our routes will need to check for req.timedout.
 // @see https://github.com/expressjs/timeout/tree/v1.8.0#api
module.exports.timedout = timeout(`${getTimeoutNumSeconds()}s`, { respond: false });
