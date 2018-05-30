'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contentful = require('../../../lib/contentful');
const stubs = require('../../utils/stubs');
const config = require('../../../config/lib/helpers/defaultTopicTrigger');
const defaultTopicTriggerContentfulFactory = require('../../utils/factories/contentful/defaultTopicTrigger');

const defaultTopicTrigger = stubs.getDefaultTopicTrigger();

// Module to test
const defaultTopicTriggerHelper = require('../../../lib/helpers/defaultTopicTrigger');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.afterEach(() => {
  sandbox.restore();
});

// fetchAll
test('fetchAll returns contentful.fetchByContentTypes parsed as defaultTopicTrigger objects', async () => {
  const firstEntry = defaultTopicTriggerContentfulFactory.getValidDefaultTopicTrigger();
  const secondEntry = defaultTopicTriggerContentfulFactory.getValidDefaultTopicTrigger();
  const fetchDefaultTopicTriggerEntriesResult = [firstEntry, secondEntry];

  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.resolve(fetchDefaultTopicTriggerEntriesResult));
  sandbox.stub(defaultTopicTriggerHelper, 'parseDefaultTopicTriggerFromContentfulEntry')
    .returns(defaultTopicTrigger);

  const result = await defaultTopicTriggerHelper.fetchAll();
  contentful.fetchByContentTypes
    .should.have.been.calledWith(config.defaultTopicTriggerContentTypes);
  fetchDefaultTopicTriggerEntriesResult.forEach((item) => {
    defaultTopicTriggerHelper.parseDefaultTopicTriggerFromContentfulEntry
      .should.have.been.calledWith(item);
  });
  result.should.deep.equal([defaultTopicTrigger, defaultTopicTrigger]);
});

test('fetchAll throws if contentful.fetchByContentTypes fails', async (t) => {
  const error = new Error('epic fail');
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.reject(error));
  sandbox.stub(defaultTopicTriggerHelper, 'parseDefaultTopicTriggerFromContentfulEntry')
    .returns(defaultTopicTrigger);

  const result = await t.throws(defaultTopicTriggerHelper.fetchAll());
  result.should.deep.equal(error);
});
