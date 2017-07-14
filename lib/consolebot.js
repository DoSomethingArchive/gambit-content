'use strict';

const colors = require('colors'); // eslint-disable-line no-unused-vars
const fs = require('fs');
const readline = require('readline');
const superagent = require('superagent');
const underscore = require('underscore');

const defaultConfig = require('../config/lib/consolebot');

class Consolebot {
  constructor(config = {}) {
    this.options = underscore.extend({}, defaultConfig, config);
    if (!this.options.phone) {
      throw new Error('phone undefined');
    }

    this.replyColor = this.options.replyColor;
    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.readline.setPrompt(`${this.options.prompt} `.bold);
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
    this.readline.prompt();
  }
  start() {
    const lineReader = readline.createInterface({
      input: fs.createReadStream(this.options.introFilePath),
    });
    lineReader
      .on('line', line => console.log(line[this.replyColor])) // eslint-disable-line no-console
      .on('close', () => this.prompt());
  }
  reply(outboundMessageText) {
    const prefix = this.options.replyPrefix.bold[this.replyColor];
    const replyText = outboundMessageText[this.replyColor];
    Consolebot.print(prefix, replyText);
    this.prompt();
  }
  static print(prefix, messageText) {
    /* eslint-disable no-console */
    console.log('');
    console.log(prefix, messageText);
    console.log('');
    /* eslint-enable no-console */
  }
}

module.exports = Consolebot;
