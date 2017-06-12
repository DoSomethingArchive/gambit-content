'use strict';

const superagent = require('superagent');
const Promise = require('bluebird');
const underscore = require('underscore');
const logger = require('winston');

const defaultConfig = require('../config/lib/dashbot');

class Dashbot {
  constructor(config = {}) {
    this.options = underscore.extend({}, defaultConfig, config);
  }
  post(msgType, data) {
    if (!this.options.apiKey) {
      return Promise.resolve(logger.warn('DASHBOT_API_KEY undefined'));
    }
    return superagent
      .post(this.options.url)
      .query({
        platform: this.options.platform,
        v: this.options.v, // eslint-disable-line id-length
        type: msgType || 'default',
        apiKey: this.options.apiKey,
      })
      .send(data)
      .then(response => logger.debug(`dashbot response:${JSON.stringify(response.body)}`))
      .catch(err => logger.error(`dashbot response::${err.message}`));
  }
}

module.exports = Dashbot;
