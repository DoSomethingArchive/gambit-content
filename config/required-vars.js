'use strict';

const logger = require('winston');
const stathat = require('../lib/stathat');

const vars = [
  'GAMBIT_CMD_MEMBER_SUPPORT',
  'GAMBIT_CMD_REPORTBACK',
  'MOBILECOMMONS_OIP_AGENTVIEW',
  'MOBILECOMMONS_OIP_CHATBOT',
];

function logMissingVar(name) {
  const msg = `undefined process.env.${name}`;
  stathat.postStat(`error: ${msg}`);
  logger.error(msg);
}

function checkRequiredVars(requiredVars) {
  let configured = true;
  requiredVars.forEach((name) => {
    const configVar = process.env[name];
    if (!configVar) {
      logMissingVar(name);
      configured = false;
    }
  });
  return configured;
}

module.exports = checkRequiredVars(vars);
