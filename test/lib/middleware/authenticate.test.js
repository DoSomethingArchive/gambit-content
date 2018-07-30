'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const logger = require('winston');
const underscore = require('underscore');

const stathat = require('../../../lib/stathat');
const config = require('../../../config/lib/middleware/authenticate');
const stubs = require('../../utils/stubs');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const authenticateRequest = require('../../../lib/middleware/authenticate');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

// stubs
const endpointStub = '/v1/topics';
const stathatStub = underscore.noop;

// Setup!
test.beforeEach((t) => {
  stubs.stubLogger(sandbox, logger);
  sandbox.stub(stathat, 'postStat').returns(stathatStub);

  // setup res mock
  t.context.res = httpMocks.createResponse();
});

// Cleanup!
test.afterEach((t) => {
  // reset stubs, spies, and mocks
  sandbox.restore();
  t.context = {};
});

test('authenticateRequest should call next if it is a GET on index', (t) => {
  // setup
  const next = sinon.stub();
  const middleware = authenticateRequest(config);
  const req = httpMocks.createRequest({
    method: 'GET',
    url: '/',
  });

  // test
  middleware(req, t.context.res, next);
  next.should.have.been.called;
});

test('authenticateRequest should call next if non-index and valid API key is sent in the headers', (t) => {
  // setup
  const next = sinon.stub();
  const middleware = authenticateRequest(config);
  const headers = {};
  headers[config.apiKeyHeaderName] = config.apiKey;
  const req = httpMocks.createRequest({
    method: 'POST',
    url: endpointStub,
    headers,
  });

  // test
  middleware(req, t.context.res, next);
  next.should.have.been.called;
});

test('authenticateRequest should call next if non-index and valid API key is sent in the query', (t) => {
  // setup
  const next = sinon.stub();
  const middleware = authenticateRequest(config);
  const query = {};
  query[config.apiKeyQueryName] = config.apiKey;
  const req = httpMocks.createRequest({
    method: 'GET',
    url: endpointStub,
    query,
  });

  // test
  middleware(req, t.context.res, next);
  next.should.have.been.called;
});

test('authenticateRequest should fail with status 403 if non-index and invalid API key is found in the headers', (t) => {
  // setup
  sandbox.spy(t.context.res, 'sendStatus'); // TODO: Implementation dependant, makes the test brittle.
  const next = sinon.stub();
  const middleware = authenticateRequest(config);
  const headers = {};
  headers[config.apiKeyHeaderName] = 'allthecovfefes';
  const req = httpMocks.createRequest({
    method: 'POST',
    url: endpointStub,
    headers,
  });

  // test
  middleware(req, t.context.res, next);
  next.should.not.have.been.called;
  t.context.res.sendStatus.should.have.been.calledWith(403);
});

test('authenticateRequest should fail with status 403 if non-index and invalid API key is found in the query', (t) => {
  // setup
  sandbox.spy(t.context.res, 'sendStatus'); // TODO: Implementation dependant, makes the test brittle.
  const next = sinon.stub();
  const middleware = authenticateRequest(config);
  const query = {};
  query[config.apiKeyQueryName] = 'sandwich';
  const req = httpMocks.createRequest({
    method: 'GET',
    url: endpointStub,
    query,
  });

  // test
  middleware(req, t.context.res, next);
  next.should.not.have.been.called;
  t.context.res.sendStatus.should.have.been.calledWith(403);
});
