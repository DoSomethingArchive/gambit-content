'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
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
const registerNewUser = require('../../../lib/middleware/register-new-user');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

// stubsxww
const newrelicStub = underscore.noop;
const handleTimeoutStub = underscore.noop;
const sendErrorResponseStub = underscore.noop;
const userPostStub = Promise.resolve(stubs.middleware.registerNewUser.getUserFromPost());
const userPostFailStub = Promise.reject({ status: 500 });

// Setup!
test.beforeEach((t) => {
  sandbox.stub(newrelic, 'addCustomParameters').returns(newrelicStub);
  sandbox.stub(helpers, 'handleTimeout').returns(handleTimeoutStub);

  // setup req, res mocks
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();

  // add params
  t.context.req.body.phone = stubs.getPhoneNumber();
  t.context.req.body.profile_id = stubs.getProfileId();
});

// Cleanup!
test.afterEach((t) => {
  // reset stubs, spies, and mocks
  sandbox.restore();
  t.context = {};
});

test('registerNewUser should inject the user into the req object when successfuly posting a new user', async (t) => {
  // setup
  const next = sinon.stub();
  const user = stubs.middleware.registerNewUser.getUserFromPost();
  sandbox.stub(User, 'post').returns(userPostStub);
  const middleware = registerNewUser();

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.handleTimeout.should.have.been.called;
  t.context.req.user.should.be.eql(user);
  next.should.have.been.called;
});

test('registerNewUser should call sendErrorResponse when posting new users fails', async (t) => {
  // setup
  const next = sinon.stub();
  sandbox.stub(User, 'post').returns(userPostFailStub);
  sandbox.stub(helpers, 'sendErrorResponse').returns(sendErrorResponseStub);
  const middleware = registerNewUser();

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.sendErrorResponse.should.have.been.called;
  next.should.not.have.been.called;
});
