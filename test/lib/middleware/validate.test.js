'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const logger = require('winston');
// const underscore = require('underscore');

const stubs = require('../../utils/stubs');
const helpers = require('../../../lib/helpers');
const userFactory = require('../../utils/factories/user');
const signupFactory = require('../../utils/factories/signup');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const validateRequest = require('../../../lib/middleware/validate');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

// Setup!
test.beforeEach((t) => {
  stubs.stubLogger(sandbox, logger);
  sandbox.spy(helpers, 'sendResponse');

  // setup res mock
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

// Cleanup!
test.afterEach((t) => {
  // reset stubs, spies, and mocks
  sandbox.restore();
  t.context = {};
});

test('validateRequest should send a 500 response if signup is undefined', (t) => {
  // setup
  const next = sinon.stub();
  const middleware = validateRequest();

  // test
  middleware(t.context.req, t.context.res, next);
  helpers.sendResponse.should.have.been.calledWith(t.context.res, 500);
  next.should.not.have.been.called;
});

test('validateRequest should call next if all validations past', (t) => {
  // setup
  const next = sinon.stub();
  const middleware = validateRequest();
  t.context.req.user = userFactory.getUser();
  t.context.req.signup = signupFactory.getValidSignup();
  t.context.req.campaign = stubs.getJSONstub('campaign', 'phoenix');

  // test
  middleware(t.context.req, t.context.res, next);
  next.should.have.been.called;
});
