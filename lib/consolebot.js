'use strict';

const colors = require('colors'); // eslint-disable-line no-unused-vars
const readline = require('readline');
const superagent = require('superagent');
const underscore = require('underscore');

const defaultConfig = require('../config/lib/consolebot');

class Consolebot {
  constructor(config = {}) {
    this.options = underscore.extend({}, defaultConfig, config);
    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.readline.setPrompt('You> '.bold);
    this.readline.on('line', input => this.post(input));
    this.readline.on('close', () => process.exit(0));
  }
  post(inboundMessageText) {
    return superagent
      .post(this.options.url)
      .set('x-gambit-api-key', this.options.apiKey)
      .send({
        phone: this.options.phone,
        args: inboundMessageText,
      })
      .then(response => this.reply(response.body.success.message))
      .catch(err => this.reply(err.message));
  }
  prompt() {
    return this.readline.prompt();
  }
  reply(replyMessageText) {
    const prefix = 'Bot>'.bold.magenta;
    const response = `${prefix} ${replyMessageText}`.yellow;

    Consolebot.print(response);

    return this.prompt();
  }
  start() {
    Consolebot.print('You\'re chatting with Gambit.');

    this.prompt();
  }
  static print(messageText) {
    /* eslint-disable no-console */
    console.log('');
    console.log(messageText);
    console.log('');
    /* eslint-enable no-console */
  }
}

module.exports = Consolebot;
