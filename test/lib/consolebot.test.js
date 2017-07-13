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

test('consolebot should call print on post', async () => {
  // setup
  const consolebot = new Consolebot(config);
  const msgType = 'hello!';
  nock(config.url)
    .post('', {})
    // nock will match any query params
    .query(true)
    .reply(200, {
      success: {
        message: 'Howdy.',
      },
    });

  // test
  await consolebot.post(msgType);
  Consolebot.print.should.have.been.called;
});
