'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');

const config = require('../../../config/lib/middleware/campaignActivity/required-params');
const helpers = require('../../../lib/helpers');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const requiredParams = require('../../../lib/middleware/required-params');

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

test('checkRequiredParams should fail if the req object doesnt contain all required params', (t) => {
  // setup
  const next = sinon.stub();
  sandbox.stub(helpers, 'sendUnproccessibleEntityResponse').returns(unprocessableEntityStub);
  const middleware = requiredParams(config);

  // test
  middleware(t.context.req, t.context.res, next);
  helpers.sendUnproccessibleEntityResponse.should.been.called;
  next.should.not.been.called;
});

test('checkRequiredParams should call next if the req object contains all required params', (t) => {
  // setup
  const next = sinon.stub();
  const middleware = requiredParams(config);
  sandbox.spy(helpers, 'sendUnproccessibleEntityResponse');
  config.requiredParams.forEach((param) => {
    t.context.req[config.containerProperty][param] = 'tacos';
  });

  // test
  middleware(t.context.req, t.context.res, next);
  helpers.sendUnproccessibleEntityResponse.should.not.have.been.called;
  next.should.have.been.called;
});
