'use strict';

// env variables
require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const logger = require('winston');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const sinon = require('sinon');
const nock = require('nock');

const readline = require('readline');

const stubs = require('../utils/stubs.js');
const config = require('../../config/lib/consolebot');

// stubs

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

// Module to test
const Consolebot = require('../../lib/consolebot');

// Setup
test.beforeEach((t) => {
  stubs.stubLogger(sandbox, logger);
  sandbox.spy(Consolebot, 'print');

  // setup req, res mocks
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

// Cleanup
test.afterEach((t) => {
  // reset stubs, spies, and mocks
  sandbox.restore();
  t.context = {};
});

test('consolebot should respond to post', () => {
  const consolebot = new Consolebot(config);
  consolebot.should.respondTo('post');
});

test('consolebot should respond to start', () => {
  const consolebot = new Consolebot(config);
  consolebot.should.respondTo('start');
});

test('consolebot should respond to reply', () => {
  const consolebot = new Consolebot(config);
  consolebot.should.respondTo('reply');
});

test('constructor should call readline.createInterface', () => {
  sandbox.spy(readline, 'createInterface');
  const consolebot = new Consolebot(config); // eslint-disable-line no-unused-vars
  readline.createInterface.should.have.been.called;
});

test('reply should call print', () => {
  const consolebot = new Consolebot(config);
  consolebot.reply('Hi again!');
  Consolebot.print.should.have.been.called;
});

test('reply should call prompt', () => {
  const consolebot = new Consolebot(config);
  sandbox.spy(consolebot, 'prompt');
  consolebot.reply('what up');
  consolebot.prompt.should.have.been.called;
});

test('start should call readline.createInterface', () => {
  const consolebot = new Consolebot(config);
  sandbox.spy(readline, 'createInterface');
  consolebot.start();
  readline.createInterface.should.have.been.called;
});

test('post should call reply on success', async () => {
  const consolebot = new Consolebot(config);
  sandbox.spy(consolebot, 'reply');

  const text = 'hello!';
  nock(config.url)
    .post('', {})
    .query(true)
    .reply(200, {
      success: {
        message: 'Howdy.',
      },
    });

  // test
  await consolebot.post(text);
  consolebot.reply.should.have.been.called;
});

test('consolebot post should call reply on error', async () => {
  const consolebot = new Consolebot(config);
  sandbox.spy(consolebot, 'reply');

  const text = 'hi!';
  nock(config.url)
    .post('', {})
    .query(true)
    .reply(500, {
      error: {
        message: 'Epic Fail :<',
      },
    });

  await consolebot.post(text);
  consolebot.reply.should.have.been.called;
});
