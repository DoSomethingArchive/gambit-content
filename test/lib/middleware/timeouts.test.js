'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const rewire = require('rewire');
const httpMocks = require('node-mocks-http');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const timeouts = rewire('../../../lib/middleware/timeouts');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

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

test('injectTimeoutString', (t) => {
  // setup
  const next = sinon.stub();
  const getTimeoutNumSeconds = timeouts.__get__('getTimeoutNumSeconds');

  // test
  timeouts.injectTimeoutString(t.context.req, t.context.res, next);
  t.context.res.timeoutNumSeconds.should.be.equal(getTimeoutNumSeconds());
  next.should.have.been.called;
});
