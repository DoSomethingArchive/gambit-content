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
const underscore = require('underscore');

const readline = require('readline');

// stubs
const stubs = require('../utils/stubs.js');

const consolebotPostArgs = stubs.consolebot.getPostArgs();

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

// Module to test
const config = require('../../config/lib/consolebot');
const Consolebot = require('../../lib/consolebot');

// Setup
const defaultMaxListeners = process.stdin.getMaxListeners();

test.beforeEach((t) => {
  stubs.stubLogger(sandbox, logger);
  sandbox.spy(Consolebot, 'print');

  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();

  // Set unlimited to avoid MaxListenersExceededWarning.
  // @see https://stackoverflow.com/a/26176922/1470725
  require('events').EventEmitter.defaultMaxListeners = 0;
});

test.afterEach((t) => {
  // reset stubs, spies, and mocks
  sandbox.restore();
  t.context = {};
  require('events').EventEmitter.defaultMaxListeners = defaultMaxListeners;
});

// Tests
test('consolebot should throw error when config.phone is undefined', (t) => {
  const testConfig = underscore.extend({}, config, {
    phone: undefined,
  });
  const error = t.throws(() => new Consolebot(testConfig), Error);
  t.is(error.message, config.phoneUndefinedMessage);
});

test('consolebot should respond to post', () => {
  const consolebot = new Consolebot(config);
  consolebot.should.respondTo('post');
});

test('consolebot should respond to prompt', () => {
  const consolebot = new Consolebot(config);
  consolebot.should.respondTo('prompt');
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

  nock(config.url)
    .post('', {})
    .query(true)
    .reply(200, {
      success: {
        message: 'Howdy.',
      },
    });

  // test
  await consolebot.post(consolebotPostArgs);
  consolebot.reply.should.have.been.called;
});

test('consolebot post should call reply on error', async () => {
  const consolebot = new Consolebot(config);
  sandbox.spy(consolebot, 'reply');

  nock(config.url)
    .post('', {})
    .query(true)
    .reply(500, {
      error: {
        message: 'Epic Fail :<',
      },
    });

  await consolebot.post(consolebotPostArgs);
  consolebot.reply.should.have.been.called;
});

const testbot = new Consolebot(config);

test('consolebot parseInput should return an object with args when no command found', (t) => {
  const testString = 'hi';
  const expected = {
    args: testString,
  };
  t.deepEqual(testbot.parseInput(testString), expected);
});

test('consolebot parseInput should return an object with keyword when keyword command', (t) => {
  const testKeyword = 'hi';
  const testString = `keyword:${testKeyword}`;
  const expected = {
    keyword: testKeyword,
  };
  t.deepEqual(testbot.parseInput(testString), expected);
});

test('consolebot parseInput should return an object with mms_image_url when photo command', (t) => {
  const testString = 'photo';
  const expected = {
    mms_image_url: config.photoUrl,
  };
  t.deepEqual(testbot.parseInput(testString), expected);
});
