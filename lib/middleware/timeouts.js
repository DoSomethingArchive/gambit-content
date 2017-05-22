'use strict';

const timeout = require('connect-timeout');

// Default limit in seconds before requests timeout
const DEFAULT_TIMEOUT_NUM_SECONDS = 15;

/**
 * Returns number of seconds to use for Gambit timeout setting.
 * @return {number}
 */
module.exports.getGambitTimeoutNumSeconds = function () {
  return Number(process.env.GAMBIT_TIMEOUT_NUM_SECONDS) || DEFAULT_TIMEOUT_NUM_SECONDS;
};

module.exports = function setUpTimeouts(app) {
  const timeoutNumSeconds = exports.getGambitTimeoutNumSeconds();
  // Set respond to false so we can send our own 504 status.
  // Note: Our routes will need to check for req.timedout.
  // @see https://github.com/expressjs/timeout/tree/v1.8.0#api
  app.use(timeout(`${timeoutNumSeconds}s`, { respond: false }));
};
