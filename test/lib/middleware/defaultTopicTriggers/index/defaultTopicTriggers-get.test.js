'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const underscore = require('underscore');

const helpers = require('../../../../../lib/helpers');
const defaultTopicTriggerFactory = require('../../../../utils/factories/defaultTopicTrigger');

const defaultTopicTriggerStubs = [
  defaultTopicTriggerFactory.getValidDefaultTopicTriggerWithReply(),
  defaultTopicTriggerFactory.getValidDefaultTopicTriggerWithReply(),
];

chai.should();
chai.use(sinonChai);

// module to be tested
const getDefaultTopicTriggers = require('../../../../../lib/middleware/defaultTopicTriggers/index/defaultTopicTriggers-get');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  sandbox.stub(helpers.response, 'sendIndexData')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('getDefaultTopicTriggers should send helpers.defaultTopicTrigger.getAll result if req.query.cache is not false', async (t) => {
  const next = sinon.stub();
  const middleware = getDefaultTopicTriggers();
  sandbox.stub(helpers.defaultTopicTrigger, 'getAll')
    .returns(Promise.resolve(defaultTopicTriggerStubs));
  sandbox.stub(helpers.defaultTopicTrigger, 'fetch')
    .returns(Promise.resolve(true));


  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.defaultTopicTrigger.getAll.should.have.been.called;
  helpers.defaultTopicTrigger.fetch.should.not.have.been.called;
  helpers.response.sendIndexData
    .should.have.been.calledWith(t.context.res, defaultTopicTriggerStubs);
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('getDefaultTopicTriggers should send helpers.defaultTopicTrigger.fetch result if req.query.cache is false', async (t) => {
  const next = sinon.stub();
  const middleware = getDefaultTopicTriggers();
  sandbox.stub(helpers.defaultTopicTrigger, 'getAll')
    .returns(Promise.resolve(defaultTopicTriggerStubs));
  sandbox.stub(helpers.defaultTopicTrigger, 'fetch')
    .returns(Promise.resolve(defaultTopicTriggerStubs));
  t.context.req.query = { cache: 'false' };

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.defaultTopicTrigger.getAll.should.not.have.been.called;
  helpers.defaultTopicTrigger.fetch.should.have.been.calledWith(t.context.req.query);
  helpers.response.sendIndexData
    .should.have.been.calledWith(t.context.res, defaultTopicTriggerStubs);
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
  helpers.response.sendIndexData.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, error);
});
