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
      return Promise.resolve(Dashbot.handleError('DASHBOT_API_KEY undefined'));
    }
    return superagent
      .post(this.options.url)
      .query(this.getQuery(msgType))
      .send(data)
      .then(response => Dashbot.handleSuccess(`dashbot response:${JSON.stringify(response.body)}`))
      .catch(err => Dashbot.handleError(`dashbot response::${err.message}`));
  }
  getQuery(msgType) {
    return {
      platform: this.options.platform,
      v: this.options.v, // eslint-disable-line id-length
      type: msgType || 'default',
      apiKey: this.options.apiKey,
    };
  }
  static handleSuccess(msg) {
    return logger.debug(msg);
  }
  static handleError(msg) {
    return logger.debug(msg);
  }
}

module.exports = Dashbot;
