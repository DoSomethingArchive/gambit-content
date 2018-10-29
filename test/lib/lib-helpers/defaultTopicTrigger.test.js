'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contentful = require('../../../lib/contentful');
const stubs = require('../../utils/stubs');
const helpers = require('../../../lib/helpers');
const config = require('../../../config/lib/helpers/defaultTopicTrigger');

const defaultTopicTriggerEntryFactory = require('../../utils/factories/contentful/defaultTopicTrigger');
const messageEntryFactory = require('../../utils/factories/contentful/message');
const defaultTopicTriggerFactory = require('../../utils/factories/defaultTopicTrigger');
const topicFactory = require('../../utils/factories/topic');

const contentfulId = stubs.getContentfulId();
const firstEntry = defaultTopicTriggerEntryFactory.getValidDefaultTopicTrigger();
const firstDefaultTopicTrigger = defaultTopicTriggerFactory.getValidDefaultTopicTriggerWithReply();
const secondEntry = defaultTopicTriggerEntryFactory.getValidDefaultTopicTrigger();
const secondDefaultTopicTrigger = defaultTopicTriggerFactory.getValidDefaultTopicTriggerWithReply();

// Module to test
const defaultTopicTriggerHelper = require('../../../lib/helpers/defaultTopicTrigger');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.afterEach(() => {
  sandbox.restore();
});

// fetch
test('fetch returns contentful.fetchByContentTypes parsed as defaultTopicTrigger objects', async () => {
  const entries = [firstEntry, secondEntry];
  const types = ['defaultTopicTrigger'];
  const fetchEntriesResult = stubs.contentful.getFetchByContentTypesResultWithArray(entries);
  sandbox.stub(defaultTopicTriggerHelper, 'getContentTypes')
    .returns(types);
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.resolve(fetchEntriesResult));
  sandbox.stub(defaultTopicTriggerHelper, 'parseDefaultTopicTrigger')
    .onCall(0)
    .returns(firstDefaultTopicTrigger)
    .onCall(1)
    .returns(secondDefaultTopicTrigger);

  const result = await defaultTopicTriggerHelper.fetch();
  contentful.fetchByContentTypes
    .should.have.been.calledWith(types);
  defaultTopicTriggerHelper.parseDefaultTopicTrigger
    .should.have.been.calledWith(firstEntry);
  defaultTopicTriggerHelper.parseDefaultTopicTrigger
    .should.have.been.calledWith(secondEntry);
  result.should.deep.equal([firstDefaultTopicTrigger, secondDefaultTopicTrigger]);
});

test('fetch throws if contentful.fetchByContentTypes fails', async (t) => {
  const error = new Error('epic fail');
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.reject(error));
  sandbox.stub(defaultTopicTriggerHelper, 'parseDefaultTopicTrigger')
    .returns(firstDefaultTopicTrigger);

  const result = await t.throws(defaultTopicTriggerHelper.fetch());
  result.should.deep.equal(error);
});

// getAll
test('getAll returns allDefaultTopicTriggers cache if set', async () => {
  const cacheResult = [firstDefaultTopicTrigger, secondDefaultTopicTrigger];
  sandbox.stub(helpers.cache.defaultTopicTriggers, 'get')
    .returns(Promise.resolve(cacheResult));
  sandbox.stub(defaultTopicTriggerHelper, 'fetch')
    .returns(Promise.resolve([]));

  const result = await defaultTopicTriggerHelper.getAll();
  helpers.cache.defaultTopicTriggers.get
    .should.have.been.calledWith(config.allDefaultTopicTriggersCacheKey);
  defaultTopicTriggerHelper.fetch.should.not.have.been.called;
  result.should.deep.equal(cacheResult);
});

test('getAll returns fetch results if cache not set', async () => {
  const fetchResult = [firstDefaultTopicTrigger, secondDefaultTopicTrigger];
  sandbox.stub(helpers.cache.defaultTopicTriggers, 'get')
    .returns(Promise.resolve(null));
  sandbox.stub(defaultTopicTriggerHelper, 'fetch')
    .returns(Promise.resolve(fetchResult));
  sandbox.stub(helpers.cache.topics, 'set')
    .returns(Promise.resolve(fetchResult));

  const result = await defaultTopicTriggerHelper.getAll();
  helpers.cache.defaultTopicTriggers.get
    .should.have.been.calledWith(config.allDefaultTopicTriggersCacheKey);
  defaultTopicTriggerHelper.fetch.should.have.been.called;
  result.should.deep.equal(fetchResult);
});

// parseDefaultTopicTrigger
test('parseDefaultTopicTrigger returns null if entry response reference is falsy', async (t) => {
  sandbox.stub(contentful, 'getResponseEntryFromDefaultTopicTrigger')
    .returns(null);

  const result = await defaultTopicTriggerHelper.parseDefaultTopicTrigger(firstEntry);
  t.is(result, null);
});

test('parseDefaultTopicTrigger returns object without topic if entry response is a message', async () => {
  const messageEntry = messageEntryFactory.getValidMessage();
  const triggerText = stubs.getRandomMessageText();
  sandbox.stub(contentful, 'getTextFromMessage')
    .returns(triggerText);
  const triggerEntry = defaultTopicTriggerEntryFactory.getValidDefaultTopicTrigger(messageEntry);

  const result = await defaultTopicTriggerHelper.parseDefaultTopicTrigger(triggerEntry);
  result.reply.should.equal(triggerText);
  result.should.not.have.property('topic');
});

test('parseDefaultTopicTrigger returns object with reply and topic if entry is transitionable', async () => {
  const topic = topicFactory.getValidTopic();
  const triggerText = stubs.getRandomMessageText();
  sandbox.stub(contentful, 'getContentfulIdFromContentfulEntry')
    .returns(contentfulId);
  sandbox.stub(contentful, 'getTextFromMessage')
    .returns(triggerText);
  sandbox.stub(helpers.contentfulEntry, 'isTransitionable')
    .returns(true);
  sandbox.stub(helpers.topic, 'getById')
    .returns(Promise.resolve(topic));

  const result = await defaultTopicTriggerHelper.parseDefaultTopicTrigger(firstEntry);
  result.id.should.equal(contentfulId);
  result.reply.should.equal(triggerText);
  result.topic.should.deep.equal(topic);
});

// removeInvalidDefaultTopicTriggers
test('removeInvalidDefaultTopicTriggers filters any null array items', () => {
  const parsedItems = [null, firstDefaultTopicTrigger, null, null, secondDefaultTopicTrigger, null];
  const result = defaultTopicTriggerHelper
    .removeInvalidDefaultTopicTriggers(parsedItems);
  result.should.deep.equal([firstDefaultTopicTrigger, secondDefaultTopicTrigger]);
});
