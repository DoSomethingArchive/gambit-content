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
const defaultTopicTriggerContentfulFactory = require('../../utils/factories/contentful/defaultTopicTrigger');
const defaultTopicTriggerFactory = require('../../utils/factories/defaultTopicTrigger');

const firstEntry = defaultTopicTriggerContentfulFactory.getValidDefaultTopicTrigger();
const firstDefaultTopicTrigger = defaultTopicTriggerFactory.getValidDefaultTopicTriggerWithReply();
const secondEntry = defaultTopicTriggerContentfulFactory.getValidDefaultTopicTrigger();
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
  const fetchEntriesResult = stubs.contentful.getFetchByContentTypesResultWithArray(entries);
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.resolve(fetchEntriesResult));
  sandbox.stub(defaultTopicTriggerHelper, 'parseDefaultTopicTriggerFromContentfulEntry')
    .onCall(0)
    .returns(firstDefaultTopicTrigger)
    .onCall(1)
    .returns(secondDefaultTopicTrigger);

  const result = await defaultTopicTriggerHelper.fetch();
  contentful.fetchByContentTypes
    .should.have.been.calledWith(config.contentTypes);
  defaultTopicTriggerHelper.parseDefaultTopicTriggerFromContentfulEntry
    .should.have.been.calledWith(firstEntry);
  defaultTopicTriggerHelper.parseDefaultTopicTriggerFromContentfulEntry
    .should.have.been.calledWith(secondEntry);
  result.should.deep.equal([firstDefaultTopicTrigger, secondDefaultTopicTrigger]);
});

test('fetch throws if contentful.fetchByContentTypes fails', async (t) => {
  const error = new Error('epic fail');
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.reject(error));
  sandbox.stub(defaultTopicTriggerHelper, 'parseDefaultTopicTriggerFromContentfulEntry')
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

// getTriggersFromDefaultTopicTriggers
test('getTriggersFromDefaultTopicTriggers returns array of trigger properties', () => {
  const defaultTopicTriggers = [firstDefaultTopicTrigger, secondDefaultTopicTrigger];

  const result = defaultTopicTriggerHelper
    .getTriggersFromDefaultTopicTriggers(defaultTopicTriggers);
  result.should.deep.equal([firstDefaultTopicTrigger.trigger, secondDefaultTopicTrigger.trigger]);
});

// removeInvalidDefaultTopicTriggers
test('removeInvalidDefaultTopicTriggers filters any null array items', () => {
  const parsedItems = [null, firstDefaultTopicTrigger, null, null, secondDefaultTopicTrigger, null];
  const result = defaultTopicTriggerHelper
    .removeInvalidDefaultTopicTriggers(parsedItems);
  result.should.deep.equal([firstDefaultTopicTrigger, secondDefaultTopicTrigger]);
});
