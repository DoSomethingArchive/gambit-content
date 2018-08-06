'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const logger = require('winston');
const sinonChai = require('sinon-chai');
const enforce = require('express-sslify');
const httpMocks = require('node-mocks-http');

const stubs = require('../../utils/stubs');

chai.should();
chai.use(sinonChai);

// module to be tested
const enforceHttpsMiddleware = rewire('../../../lib/middleware/enforce-https');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  stubs.stubLogger(sandbox, logger);
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  // reset stubs, spies, and mocks
  sandbox.restore();
  t.context = {};
  enforceHttpsMiddleware.__set__('enforce', enforce);
});

test('enforceHttpsMiddleware should return dummy function that always calls next if forceHttps is false', (t) => {
  const forceHttps = false;
  const middleware = enforceHttpsMiddleware(forceHttps);
  const next = sinon.stub();

  middleware(t.context.req, t.context.res, next);
  next.should.have.been.called;
});

test('enforceHttpsMiddleware should return a function that enforces HTTPS if forceHttps is true', () => {
  const forceHttps = true;
  const enforceStub = { HTTPS: sinon.stub() };
  enforceHttpsMiddleware.__set__('enforce', enforceStub);
  enforceHttpsMiddleware(forceHttps);

  enforceStub.HTTPS.should.have.been.calledWith({ trustProtoHeader: true });
});
