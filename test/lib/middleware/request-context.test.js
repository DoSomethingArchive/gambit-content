'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const underscore = require('underscore');

const config = require('../../../config/middleware/chatbot/request-context');
const helpers = require('../../../lib/helpers');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const requestContext = require('../../../lib/middleware/request-context');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

// stubs
const unprocessableEntityStub = () => true;

// Setup!
test.beforeEach((t) => {
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

test('checkRequestContext should fail if the req object doesnt contain at least one request context params', (t) => {
  // setup
  const next = sinon.stub();
  sandbox.stub(helpers, 'sendUnproccessibleEntityResponse').returns(unprocessableEntityStub);
  const middleware = requestContext(config);

  // test
  middleware(t.context.req, t.context.res, next);
  helpers.sendUnproccessibleEntityResponse.should.have.been.called;
  next.should.not.have.been.called;
});

test('checkRequestContext should call next if the req object contains at least one of the possible context parameters', (t) => {
  // setup
  const next = sinon.stub();
  sandbox.spy(helpers, 'sendUnproccessibleEntityResponse');
  const middleware = requestContext(config);
  const contextParam = underscore.sample(Object.keys(config.requestContexts));
  t.context.req[config.containerProperty][contextParam] = 'tacos';

  // test
  middleware(t.context.req, t.context.res, next);
  helpers.sendUnproccessibleEntityResponse.should.not.have.been.called;
  next.should.have.been.called;
});
