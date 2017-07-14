'use strict';

require('dotenv').config();
const appConfig = require('../../');

const configVars = {
  apiKey: appConfig.apiKey,
  phone: process.env.GAMBIT_CONSOLEBOT_PHONE || 'consolebot',
  prompt: process.env.GAMBIT_CONSOLEBOT_PROMPT || 'You>',
  replyPrefix: process.env.GAMBIT_CONSOLEBOT_REPLY_PREFIX || 'Bot>',
  replyColor: process.env.GAMBIT_CONSOLEBOT_REPLY_COLOR || 'magenta',
  url: `http://localhost:${appConfig.port}/v1/chatbot`,
};

module.exports = configVars;
