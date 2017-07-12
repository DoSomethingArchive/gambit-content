'use strict';

require('dotenv').config();

const readline = require('readline');
const superagent = require('superagent');
const colors = require('colors'); // eslint-disable-line no-unused-vars
const config = require('./config');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/* eslint-disable no-console */

// http://patorjk.com/software/taag/#p=display&f=ANSI%20Shadow&t=Gambit
console.log('');
console.log('');
console.log(' ██████╗  █████╗ ███╗   ███╗██████╗ ██╗████████╗'.bold.magenta)
console.log('██╔════╝ ██╔══██╗████╗ ████║██╔══██╗██║╚══██╔══╝'.bold.magenta)
console.log('██║  ███╗███████║██╔████╔██║██████╔╝██║   ██║   '.bold.magenta)
console.log('██║   ██║██╔══██║██║╚██╔╝██║██╔══██╗██║   ██║   '.bold.magenta)
console.log('╚██████╔╝██║  ██║██║ ╚═╝ ██║██████╔╝██║   ██║   '.bold.magenta)
console.log(' ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═════╝ ╚═╝   ╚═╝   '.bold.magenta);
console.log('');
console.log('');

rl.setPrompt('You> '.bold);
rl.prompt();

rl.on('line', (cmd) => {
  // Post to our local chatbot endpoint to chat.
  return superagent
    .post(`http://localhost:${config.port}/v1/chatbot`)
    .set('x-gambit-api-key', config.apiKey)
    .send({
      phone: config.consoleBotPhone,
      args: cmd,
    })
    .then((res) => {
      const reply = res.body.success.message;
      if (reply) {
        console.log('');
        console.log('Bot>'.bold.magenta, `${reply}`.yellow);
        console.log('');
      }

      return rl.prompt();
    })
    .catch((err) => {
      console.log(`error:${err.message}`);
      return rl.prompt();
    });
}).on('close', () => {
  console.log('');
  process.exit(0);
});
/* eslint-disable no-console */

