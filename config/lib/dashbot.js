'use strict';

const configVars = {
  url: 'https://tracker.dashbot.io/track',
  platform: 'generic',
  v: '0.8.2-rest', // eslint-disable-line id-length
  apiKey: process.env.DASHBOT_API_KEY,
};

module.exports = configVars;
