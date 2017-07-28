'use strict';

const path = require('path');

require('dotenv').config();
const appConfig = require('../../');

// Used as a Reportback image.
const photoUrl = 'https://www.wired.com/wp-content/uploads/2015/03/The-X-Files1-1024x768.jpg';

const configVars = {
  apiKey: appConfig.apiKey,
  introFilePath: path.resolve(__dirname, 'intro.txt'),
  phone: process.env.GAMBIT_CONSOLEBOT_PHONE,
  phoneUndefinedMessage: 'process.env.GAMBIT_CONSOLEBOT_PHONE undefined',
  photoUrl: process.env.GAMBIT_CONSOLEBOT_PHOTO_URL || photoUrl,
  prompt: process.env.GAMBIT_CONSOLEBOT_PROMPT || 'You>',
  replyPrefix: process.env.GAMBIT_CONSOLEBOT_REPLY_PREFIX || 'Bot>',
  replyColor: process.env.GAMBIT_CONSOLEBOT_REPLY_COLOR || 'magenta',
  url: `http://localhost:${appConfig.port}/v1/chatbot`,
};

module.exports = configVars;
