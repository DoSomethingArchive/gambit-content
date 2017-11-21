'use strict';

const stathat = require('../lib/stathat');

const missingRequiredVars = [];
const vars = [
  'GAMBIT_CMD_MEMBER_SUPPORT',
  'GAMBIT_CMD_REPORTBACK',
];

function logMissingVar(name) {
  stathat.postStat(`error: undefined process.env.${name}`);
}

function checkRequiredVars(requiredVars) {
  let configured = true;
  requiredVars.forEach((name) => {
    const configVar = process.env[name];
    if (!configVar) {
      logMissingVar(name);
      missingRequiredVars.push(name);
      configured = false;
    }
  });
  return configured;
}

module.exports = () => {
  const passCheck = checkRequiredVars(vars);

  if (!passCheck) {
    throw new Error(`Gambit is misconfigured. Missing ${missingRequiredVars.join(', ')}`);
  }

  return passCheck;
};
