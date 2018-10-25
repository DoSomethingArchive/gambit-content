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
const topicFactory = require('../../../../utils/factories/topic');

chai.should();
chai.use(sinonChai);

// module to be tested
const getTopics = require('../../../../../lib/middleware/topics/index/topics-get');

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

test('getTopics should send helpers.topic.fetch result', async (t) => {
  const next = sinon.stub();
  const middleware = getTopics();
  const topics = [topicFactory.getValidTopic(), topicFactory.getValidTopic()];
  const fetchResult = stubs.contentful.getFetchByContentTypesResultWithArray(topics);
  sandbox.stub(helpers.topic, 'fetch')
    .returns(Promise.resolve(fetchResult));
  const queryParams = { skip: 20 };
  t.context.req.query = queryParams;

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.topic.fetch.should.have.been.calledWith(queryParams);
  helpers.response.sendIndexData
    .should.have.been.calledWith(t.context.res, fetchResult.data, fetchResult.meta);
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('getTopics should send errorResponse if helpers.topic.fetch fails', async (t) => {
  const next = sinon.stub();
  const middleware = getTopics();
  const error = new Error('o noes');
  sandbox.stub(helpers.topic, 'fetch')
    .returns(Promise.reject(error));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.topic.fetch.should.have.been.called;
  helpers.response.sendIndexData.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, error);
});
