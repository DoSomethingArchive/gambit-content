'use strict';

const timeout = require('connect-timeout');

/**
 * Returns number of seconds to use for Gambit timeout setting.
 * @return {number}
 */
module.exports.getGambitTimeoutNumSeconds = function () {
  return Number(process.env.GAMBIT_TIMEOUT_NUM_SECONDS) || 15;
};

module.exports.injectTimeoutString = function injectTimeoutString(req, res, next) {
  res.timeoutNumSeconds = exports.getGambitTimeoutNumSeconds();
  next();
};

module.exports = function setUpTimeouts(app) {
  const timeoutNumSeconds = exports.getGambitTimeoutNumSeconds();

  app.use(exports.injectTimeoutString);
  // Set respond to false so we can send our own 504 status.
  // Note: Our routes will need to check for req.timedout.
  // @see https://github.com/expressjs/timeout/tree/v1.8.0#api
  app.use(timeout(`${timeoutNumSeconds}s`, { respond: false }));
};
