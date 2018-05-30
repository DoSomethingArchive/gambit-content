'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const underscore = require('underscore');

const stubs = require('../../../../utils/stubs');
const helpers = require('../../../../../lib/helpers');

const defaultTopicTriggerStubs = [stubs.getDefaultTopicTrigger(), stubs.getDefaultTopicTrigger()];

chai.should();
chai.use(sinonChai);

// module to be tested
const getDefaultTopicTriggers = require('../../../../../lib/middleware/defaultTopicTriggers/index');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
  sandbox.spy(t.context.res, 'send');
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('getDefaultTopicTriggers should send helpers.defaultTopicTrigger.getAll result', async (t) => {
  const next = sinon.stub();
  const middleware = getDefaultTopicTriggers();
  sandbox.stub(helpers.defaultTopicTrigger, 'getAll')
    .returns(Promise.resolve(defaultTopicTriggerStubs));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.defaultTopicTrigger.getAll.should.have.been.called;
  t.context.res.send.should.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});


test('getDefaultTopicTriggers should send errorResponse if helpers.defaultTopicTrigger.getAll fails', async (t) => {
  const next = sinon.stub();
  const middleware = getDefaultTopicTriggers();
  const error = new Error('o noes');
  sandbox.stub(helpers.defaultTopicTrigger, 'getAll')
    .returns(Promise.reject(error));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.defaultTopicTrigger.getAll.should.have.been.called;
  t.context.res.send.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, error);
});
