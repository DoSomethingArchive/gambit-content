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
const querystring = require('querystring');

const stubs = require('../utils/stubs.js');
const config = require('../../config/lib/dashbot');

// stubs

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

// Module to test
const Dashbot = require('../../lib/dashbot');

// Setup
test.beforeEach((t) => {
  stubs.stubLogger(sandbox, logger);
  sandbox.spy(Dashbot, 'handleSuccess');
  sandbox.spy(Dashbot, 'handleError');

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

test('dashbot should respond to post', () => {
  const dashbot = new Dashbot(config);
  dashbot.should.respondTo('post');
});

test('dashbot should not post statistics if apiKey is undefined', async () => {
  // setup
  const testConfig = underscore.extend({}, config, {
    apiKey: undefined,
  });
  const dashbot = new Dashbot(testConfig);

  // test
  await dashbot.post('test_type', {});
  Dashbot.handleError.should.have.been.called;
});

test('dashbot should call handleSuccess on successful post', async () => {
  // setup
  const dashbot = new Dashbot(config);
  const msgType = 'test';
  nock(config.url)
    .post(`?${querystring.stringify(dashbot.getQuery(msgType))}`, {})
    .reply(201, 'testing, is all good');

  // test
  await dashbot.post(msgType, {});
  Dashbot.handleSuccess.should.have.been.called;
});

test('dashbot should call handleError on failed post', async () => {
  // setup
  const dashbot = new Dashbot(config);
  const msgType = 'test';
  nock(config.url)
    .post(`?${querystring.stringify(dashbot.getQuery(msgType))}`, {})
    .reply(500, 'testing, is all bad');

  // test
  await dashbot.post(msgType, {});
  Dashbot.handleError.should.have.been.called;
});
