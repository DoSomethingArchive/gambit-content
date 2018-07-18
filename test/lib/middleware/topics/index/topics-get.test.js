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

chai.should();
chai.use(sinonChai);

// module to be tested
const getTopics = require('../../../../../lib/middleware/topics/index/topics-get');

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

test('getTopics should send helpers.topic.fetch result', async (t) => {
  const next = sinon.stub();
  const middleware = getTopics();
  const triggers = [stubs.getRandomWord()];
  const firstTopic = topicFactory.getValidTopic();
  const secondTopic = topicFactory.getValidTopic();
  sandbox.stub(helpers.topic, 'fetch')
    .returns(Promise.resolve({ data: [firstTopic, secondTopic] }));
  sandbox.stub(helpers.defaultTopicTrigger, 'getByTopicId')
    .returns(Promise.resolve(defaultTopicTriggerFactory.getValidDefaultTopicTriggerWithTopic()));
  sandbox.stub(helpers.defaultTopicTrigger, 'getTriggersFromDefaultTopicTriggers')
    .returns(triggers);

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.topic.fetch.should.have.been.called;
  helpers.defaultTopicTrigger.getByTopicId.should.have.been.calledWith(firstTopic.id);
  helpers.defaultTopicTrigger.getByTopicId.should.have.been.calledWith(secondTopic.id);
  t.context.req.data[0].name.should.equal(firstTopic.name);
  t.context.req.data[1].name.should.equal(secondTopic.name);
  t.context.req.data[0].triggers.should.equal(triggers);
  t.context.req.data[1].triggers.should.equal(triggers);
  t.context.res.send.should.have.been.called;
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
  t.context.res.send.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, error);
});
