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

const sandbox = sinon.sandbox.create();

test.afterEach(() => {
  sandbox.restore();
  cacheHelper.__set__('campaignsCache', undefined);
});

/**
 * Campaigns
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
    set: () => Promise.resolve(campaign),
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
