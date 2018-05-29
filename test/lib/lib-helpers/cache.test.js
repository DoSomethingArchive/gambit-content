'use strict';

require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const rewire = require('rewire');

chai.should();
chai.use(sinonChai);

// module to be tested
const cacheHelper = rewire('../../../lib/helpers/cache');

// stubs
const stubs = require('../../utils/stubs');

const campaign = stubs.getPhoenixCampaign();
const campaignId = stubs.getCampaignId();
const contentfulId = stubs.getContentfulId();
const defaultTopicTrigger = stubs.getDefaultTopicTrigger();
const topic = stubs.getTopic();

const sandbox = sinon.sandbox.create();

test.afterEach(() => {
  sandbox.restore();
  cacheHelper.__set__('campaignsCache', undefined);
  cacheHelper.__set__('defaultTopicTriggersCache', undefined);
});

/**
 * campaigns
 */
test('campaigns.get should return object when cache exists', async () => {
  cacheHelper.__set__('campaignsCache', {
    get: () => Promise.resolve(campaign),
  });
  const result = await cacheHelper.campaigns.get(campaignId);
  result.should.deep.equal(campaign);
});

test('campaigns.get should return falsy when cache undefined', async (t) => {
  cacheHelper.__set__('campaignsCache', {
    get: () => Promise.resolve(null),
  });
  const result = await cacheHelper.campaigns.get(campaignId);
  t.falsy(result);
});

test('campaigns.get should throw when cache set fails', async (t) => {
  cacheHelper.__set__('campaignsCache', {
    get: () => Promise.reject(new Error()),
  });
  await t.throws(cacheHelper.campaigns.get(campaignId));
});

test('campaigns.set should return an object', async () => {
  cacheHelper.__set__('campaignsCache', {
    set: () => Promise.resolve(JSON.stringify(campaign)),
  });
  const result = await cacheHelper.campaigns.set(campaignId);
  result.should.deep.equal(campaign);
});

test('campaigns.set should throw when cache set fails', async (t) => {
  cacheHelper.__set__('campaignsCache', {
    set: () => Promise.reject(new Error()),
  });
  await t.throws(cacheHelper.campaigns.set(campaignId));
});

/**
 * defaultTopicTriggers
 */
test('defaultTopicTriggers.get should return object when cache exists', async () => {
  cacheHelper.__set__('defaultTopicTriggersCache', {
    get: () => Promise.resolve(defaultTopicTrigger),
  });
  const result = await cacheHelper.defaultTopicTriggers.get(contentfulId);
  result.should.deep.equal(defaultTopicTrigger);
});

test('defaultTopicTriggers.get should return falsy when cache undefined', async (t) => {
  cacheHelper.__set__('defaultTopicTriggersCache', {
    get: () => Promise.resolve(null),
  });
  const result = await cacheHelper.defaultTopicTriggers.get(contentfulId);
  t.falsy(result);
});

test('defaultTopicTriggers.get should throw when cache set fails', async (t) => {
  cacheHelper.__set__('defaultTopicTriggersCache', {
    get: () => Promise.reject(new Error()),
  });
  await t.throws(cacheHelper.defaultTopicTriggers.get(contentfulId));
});

test('defaultTopicTriggers.set should return an object', async () => {
  cacheHelper.__set__('defaultTopicTriggersCache', {
    set: () => Promise.resolve(JSON.stringify(defaultTopicTrigger)),
  });
  const result = await cacheHelper.defaultTopicTriggers.set(contentfulId);
  result.should.deep.equal(defaultTopicTrigger);
});

test('defaultTopicTriggers.set should throw when cache set fails', async (t) => {
  cacheHelper.__set__('defaultTopicTriggersCache', {
    set: () => Promise.reject(new Error()),
  });
  await t.throws(cacheHelper.defaultTopicTriggers.set(contentfulId));
});

/**
 * topics
 */
test('topics.get should return object when cache exists', async () => {
  cacheHelper.__set__('topicsCache', {
    get: () => Promise.resolve(topic),
  });
  const result = await cacheHelper.topics.get(contentfulId);
  result.should.deep.equal(topic);
});

test('topics.get should return falsy when cache undefined', async (t) => {
  cacheHelper.__set__('topicsCache', {
    get: () => Promise.resolve(null),
  });
  const result = await cacheHelper.topics.get(contentfulId);
  t.falsy(result);
});

test('topics.get should throw when cache set fails', async (t) => {
  cacheHelper.__set__('topicsCache', {
    get: () => Promise.reject(new Error()),
  });
  await t.throws(cacheHelper.topics.get(contentfulId));
});

test('topics.set should return an object', async () => {
  cacheHelper.__set__('topicsCache', {
    set: () => Promise.resolve(JSON.stringify(topic)),
  });
  const result = await cacheHelper.topics.set(contentfulId);
  result.should.deep.equal(topic);
});

test('topics.set should throw when cache set fails', async (t) => {
  cacheHelper.__set__('topicsCache', {
    set: () => Promise.reject(new Error()),
  });
  await t.throws(cacheHelper.topics.set(contentfulId));
});
