'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const underscore = require('underscore');
const Promise = require('bluebird');

const helpers = require('../../../lib/helpers');
const Signup = require('../../../app/models/Signup');
const stubs = require('../../utils/stubs');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const getSignup = require('../../../lib/middleware/signup-get');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

// Stubs
const handleTimeoutStub = underscore.noop;
const sendErrorResponseStub = underscore.noop;
const signupLookupStub = Promise.resolve(stubs.getSignupWithDraft());
const signupLookupNotFoundStub = Promise.resolve(false);
const signupLookupFailStub = Promise.reject({ status: 500 });

// Setup!
test.beforeEach((t) => {
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

test('getSignup should inject signup, draftSubmission into the req object', async (t) => {
  // setup
  const next = sinon.stub();
  const middleware = getSignup();
  const signup = stubs.getSignupWithDraft();
  sandbox.stub(Signup, 'lookupCurrentSignupForReq').returns(signupLookupStub);

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.handleTimeout.should.have.been.called;
  t.context.req.signup.should.be.eql(signup);
  t.context.req.draftSubmission.should.be.eql(signup.draft_reportback_submission);
  next.should.have.been.called;
});

test('getSignup should resolve to false if a Signup was not found', async (t) => {
  // setup
  const next = sinon.stub();
  const middleware = getSignup();
  sandbox.stub(Signup, 'lookupCurrentSignupForReq').returns(signupLookupNotFoundStub);

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.handleTimeout.should.have.been.called;
  chai.should().not.exist(t.context.req.signup);
  chai.should().not.exist(t.context.req.draftSubmission);
  next.should.have.been.called;
});

test('getSignup should call sendErrorResponse when an error occurs', async (t) => {
  // setup
  const next = sinon.stub();
  sandbox.stub(Signup, 'lookupCurrentSignupForReq').returns(signupLookupFailStub);
  sandbox.stub(helpers, 'sendErrorResponse').returns(sendErrorResponseStub);
  const middleware = getSignup();

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.sendErrorResponse.should.have.been.called;
  next.should.not.have.been.called;
});
