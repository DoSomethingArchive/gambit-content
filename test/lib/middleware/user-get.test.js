'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const logger = require('winston');
const newrelic = require('newrelic');
const underscore = require('underscore');
const Promise = require('bluebird');

const helpers = require('../../../lib/helpers');
const User = require('../../../app/models/User');
const stubs = require('../../utils/stubs');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const getUser = require('../../../lib/middleware/user-get');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

// stubs
const newrelicStub = underscore.noop;
const handleTimeoutStub = underscore.noop;
const sendErrorResponseStub = underscore.noop;
const userLookupStub = Promise.resolve(stubs.middleware.getUser.getUserFromLookup());
const userLookupFailStub = Promise.reject({ status: 500 });
const userLookupNotFoundStub = Promise.reject({ status: 404 });
const trackUserMessageInDashbotStub = underscore.noop;

// Setup!
test.beforeEach((t) => {
  stubs.stubLogger(sandbox, logger);
  sandbox.stub(newrelic, 'addCustomParameters').returns(newrelicStub);
  sandbox.stub(helpers, 'trackUserMessageInDashbot').returns(trackUserMessageInDashbotStub);
  sandbox.stub(helpers, 'handleTimeout').returns(handleTimeoutStub);

  // setup req, res mocks
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

// Cleanup!
test.afterEach((t) => {
  // reset stubs, spies, and mocks
  sandbox.restore();
  t.context = {};
});

test('getUser should inject the user into the req object when found in the database', async (t) => {
  // setup
  const next = sinon.stub();
  const number = stubs.getPhoneNumber();
  const user = stubs.middleware.getUser.getUserFromLookup();
  sandbox.stub(User, 'lookup').returns(userLookupStub);
  const middleware = getUser();
  t.context.req.body.phone = number;

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.handleTimeout.should.have.been.called;
  t.context.req.user.should.be.eql(user);
  next.should.have.been.called;
});

test('getUser should call sendErrorResponse when an error that is not 404 occurs', async (t) => {
  // setup
  const next = sinon.stub();
  const number = stubs.getPhoneNumber();
  sandbox.stub(User, 'lookup').returns(userLookupFailStub);
  sandbox.stub(helpers, 'sendErrorResponse').returns(sendErrorResponseStub);
  const middleware = getUser();
  t.context.req.body.phone = number;

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.sendErrorResponse.should.have.been.called;
  next.should.not.have.been.called;
});

test('getUser should call next is a 404 is returned from User.lookup', async (t) => {
  // setup
  const next = sinon.stub();
  const number = stubs.getPhoneNumber();
  sandbox.stub(User, 'lookup').returns(userLookupNotFoundStub);
  const middleware = getUser();
  t.context.req.body.phone = number;

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.handleTimeout.should.have.been.called;
  next.should.have.been.called;
});
