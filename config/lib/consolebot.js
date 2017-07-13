'use strict';

require('dotenv').config();
const appConfig = require('../');

const configVars = {
  apiKey: appConfig.apiKey,
  phone: process.env.GAMBIT_CONSOLEBOT_PHONE || 'consolebot',
  url: `http://localhost:${appConfig.port}/v1/chatbot`,
};

module.exports = configVars;
