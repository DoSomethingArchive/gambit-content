'use strict';

const configVars = {};
configVars.apiKey = process.env.GAMBIT_API_KEY || 'totallysecret';
configVars.apiKeyHeaderName = 'x-gambit-api-key';
configVars.apiKeyQueryName = 'apiKey';
module.exports = configVars;
