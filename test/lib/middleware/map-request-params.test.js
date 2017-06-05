'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const logger = require('winston');

const stathat = require('../../../lib/stathat');
const config = require('../../../config/middleware/chatbot/map-request-params');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const mapRequestParams = require('../../../lib/middleware/map-request-params');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

// stubs
const loggerStub = () => true;
const stathatStub = () => true;

// Setup!
test.beforeEach((t) => {
  sandbox.stub(logger, 'info').returns(loggerStub);
  sandbox.stub(stathat, 'postStat').returns(stathatStub);

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

test('mapRequestParams should strip emojies from the args param when mapping', (t) => {
  // setup
  const next = sinon.stub();
  const middleware = mapRequestParams(config);
  const emojiStripParam = config.emojiStripParam;
  const toLowerCaseParam = config.lowercaseParam;
  const prefix = 'catdot!';
  const emojiStripValue = `${prefix}🐱🐶`;
  const toLowerCaseValue = 'DOSOMETHING';
  t.context.req[config.containerProperty][emojiStripParam] = emojiStripValue;
  t.context.req[config.containerProperty][toLowerCaseParam] = toLowerCaseValue;

  // test
  middleware(t.context.req, t.context.res, next);
  t.context.req[config.paramsMap[emojiStripParam]].should.be.equal(prefix);
  t.context.req[config.paramsMap[toLowerCaseParam]].should.be.equal(toLowerCaseValue.toLowerCase());
  next.should.have.been.called;
});
