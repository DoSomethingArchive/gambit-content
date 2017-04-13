'use strict';

const stathat = require('stathat');
const logger = require('winston');

/**
 * Posts given statName to Stathat via EZ API.
 *
 * @param {string} statName
 */
module.exports.postStat = function (statName) {
  const key = process.env.STATHAT_EZ_KEY;
  if (!key) {
    logger.warn('STATHAT_EZ_KEY undefined');

    return;
  }
  const appName = process.env.STATHAT_APP_NAME || 'gambit';
  const stat = `${appName} - ${statName}`;
  // Bump count of stat by 1.
  stathat.trackEZCount(key, stat, 1, (status) => {
    const msg = `stathat response:${status} postStat:'${stat}'`;
    logger.debug(msg);
  });
};

/**
 * Posts given statName and error info to Stathat via EZ API.
 *
 * @param {string} statName
 * @param {object} error
 */
module.exports.postStatWithError = function (statName, error) {
  if (error.status) {
    this.postStat(`${statName} ${error.status}`);
  } else {
    this.postStat(`${statName} failed`);
  }
};
