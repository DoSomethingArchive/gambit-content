'use strict';

const path = require('path');

require('dotenv').config();
const appConfig = require('../../');

const configVars = {
  apiKey: appConfig.apiKey,
  introFilePath: path.resolve(__dirname, 'intro.txt'),
  phone: process.env.GAMBIT_CONSOLEBOT_PHONE,
  prompt: process.env.GAMBIT_CONSOLEBOT_PROMPT || 'You>',
  replyPrefix: process.env.GAMBIT_CONSOLEBOT_REPLY_PREFIX || 'Bot>',
  replyColor: process.env.GAMBIT_CONSOLEBOT_REPLY_COLOR || 'magenta',
  url: `http://localhost:${appConfig.port}/v1/chatbot`,
};

module.exports = configVars;
