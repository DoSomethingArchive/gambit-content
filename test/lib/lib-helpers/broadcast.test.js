'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contentful = require('../../../lib/contentful');
const stubs = require('../../utils/stubs');
const config = require('../../../config/lib/helpers/broadcast');
const broadcastEntryFactory = require('../../utils/factories/contentful/broadcast');
const broadcastFactory = require('../../utils/factories/broadcast');

const broadcastId = stubs.getContentfulId();
const broadcastEntry = broadcastEntryFactory.getValidCampaignBroadcast();
const broadcast = broadcastFactory.getValidCampaignBroadcast();

// Module to test
const broadcastHelper = require('../../../lib/helpers/broadcast');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.afterEach(() => {
  sandbox.restore();
});

// fetchAll
test('fetchAll returns contentful.fetchByContentTypes parsed as broadcast objects', async () => {
  const fetchEntriesResult = [broadcastEntry];
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.resolve(fetchEntriesResult));
  sandbox.stub(broadcastHelper, 'parseBroadcastFromContentfulEntry')
    .returns(Promise.resolve(broadcast));

  const result = await broadcastHelper.fetchAll();
  contentful.fetchByContentTypes.should.have.been.calledWith(config.broadcastContentTypes);
  fetchEntriesResult.forEach((item) => {
    broadcastHelper.parseBroadcastFromContentfulEntry.should.have.been.calledWith(item);
  });
  result.should.deep.equal([broadcast]);
});

test('fetchAll throws if contentful.fetchByContentTypes fails', async (t) => {
  const error = new Error('epic fail');
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.reject(error));
  sandbox.stub(broadcastHelper, 'parseBroadcastFromContentfulEntry')
    .returns(Promise.resolve(broadcast));

  const result = await t.throws(broadcastHelper.fetchAll());
  result.should.deep.equal(error);
});

// fetchById
test('fetchById returns contentful.fetchByContentfulId parsed as broadcast object', async () => {
  const fetchEntryResult = broadcastEntry;
  sandbox.stub(contentful, 'fetchByContentfulId')
    .returns(Promise.resolve(fetchEntryResult));
  sandbox.stub(broadcastHelper, 'parseBroadcastFromContentfulEntry')
    .returns(Promise.resolve(broadcast));

  const result = await broadcastHelper.fetchById(broadcastId);
  contentful.fetchByContentfulId.should.have.been.calledWith(broadcastId);
  broadcastHelper.parseBroadcastFromContentfulEntry.should.have.been.calledWith(fetchEntryResult);
  result.should.deep.equal(broadcast);
});
