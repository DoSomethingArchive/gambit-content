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

const defaultTopicTriggerFactory = require('../../../../utils/factories/defaultTopicTrigger');
const topicFactory = require('../../../../utils/factories/topic');

const topic = topicFactory.getValidTopic();
const defaultTopicTrigger = defaultTopicTriggerFactory.getValidDefaultTopicTriggerWithTopic();

chai.should();
chai.use(sinonChai);

// module to be tested
const getTopic = require('../../../../../lib/middleware/topics/single/topic-get');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.req.params = {
    topicId: stubs.getContentfulId(),
  };
  t.context.res = httpMocks.createResponse();
  sandbox.spy(t.context.res, 'send');
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('getTopic should inject a topic property set to getById result', async (t) => {
  const next = sinon.stub();
  const middleware = getTopic();
  sandbox.stub(helpers.topic, 'getById')
    .returns(Promise.resolve(topic));
  sandbox.stub(helpers.defaultTopicTrigger, 'getByTopicId')
    .returns(Promise.resolve([defaultTopicTrigger]));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.topic.getById.should.have.been.calledWith(t.context.req.params.topicId);
  t.context.res.send.should.have.been.calledWith({ data: topic });
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('getTopic should sendErrorResponse if getById fails', async (t) => {
  const next = sinon.stub();
  const middleware = getTopic();
  const mockError = { message: 'Epic fail' };
  sandbox.stub(helpers.topic, 'getById')
    .returns(Promise.reject(mockError));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.topic.getById.should.have.been.calledWith(t.context.req.params.topicId);
  t.context.res.send.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, mockError);
});
