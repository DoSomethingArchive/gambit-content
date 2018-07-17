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

// stubs
const attachments = [stubs.getAttachment()];
const broadcastId = stubs.getContentfulId();
const broadcastEntry = broadcastEntryFactory.getValidCampaignBroadcast();
const broadcast = broadcastFactory.getValidCampaignBroadcast();
const broadcastName = stubs.getBroadcastName();
const campaignId = stubs.getCampaignId();

// Module to test
const broadcastHelper = require('../../../lib/helpers/broadcast');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.beforeEach(() => {
  sandbox.stub(contentful, 'getContentfulIdFromContentfulEntry')
    .returns(broadcastId);
  sandbox.stub(contentful, 'getNameTextFromContentfulEntry')
    .returns(broadcastName);
  sandbox.stub(contentful, 'getCampaignIdFromContentfulEntry')
    .returns(campaignId);
});

test.afterEach(() => {
  sandbox.restore();
});

// fetch
test('fetch returns contentful.fetchByContentTypes parsed as broadcast objects', async () => {
  const fetchEntriesResult = { items: [broadcastEntry] };
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.resolve(fetchEntriesResult));
  sandbox.stub(broadcastHelper, 'parseBroadcastFromContentfulEntry')
    .returns(broadcast);

  const result = await broadcastHelper.fetch();
  contentful.fetchByContentTypes.should.have.been.calledWith(config.broadcastContentTypes);
  fetchEntriesResult.items.forEach((item) => {
    broadcastHelper.parseBroadcastFromContentfulEntry.should.have.been.calledWith(item);
  });
  result.data.should.deep.equal([broadcast]);
});

test('fetch throws if contentful.fetchByContentTypes fails', async (t) => {
  const error = new Error('epic fail');
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.reject(error));
  sandbox.stub(broadcastHelper, 'parseBroadcastFromContentfulEntry')
    .returns(broadcast);

  const result = await t.throws(broadcastHelper.fetch());
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

// parseBroadcastFromContentfulEntry
test('parseBroadcastFromContentfulEntry returns an object with null topic if campaign broadcast', (t) => {
  sandbox.stub(contentful, 'getAttachmentsFromContentfulEntry')
    .returns(attachments);

  const result = broadcastHelper.parseBroadcastFromContentfulEntry(broadcastEntry);
  contentful.getContentfulIdFromContentfulEntry.should.have.been.calledWith(broadcastEntry);
  result.id.should.equal(broadcastId);
  contentful.getNameTextFromContentfulEntry.should.have.been.calledWith(broadcastEntry);
  result.name.should.equal(broadcastName);
  t.is(result.topic, null);
  result.campaignId.should.equal(campaignId);
  result.message.text.should.equal(broadcastEntry.fields.message);
  result.message.template.should.equal(broadcastEntry.fields.template);
  contentful.getAttachmentsFromContentfulEntry.should.have.been.calledWith(broadcastEntry);
  result.message.attachments.should.equal(attachments);
});

test('parseBroadcastFromContentfulEntry returns an object with null campaignId if hardcoded topic broadcast', (t) => {
  const hardcodedTopicBroadcastEntry = broadcastEntryFactory.getValidTopicBroadcast();
  const result = broadcastHelper.parseBroadcastFromContentfulEntry(hardcodedTopicBroadcastEntry);
  contentful.getContentfulIdFromContentfulEntry
    .should.have.been.calledWith(hardcodedTopicBroadcastEntry);
  result.id.should.equal(broadcastId);
  contentful.getNameTextFromContentfulEntry
    .should.have.been.calledWith(hardcodedTopicBroadcastEntry);
  result.name.should.equal(broadcastName);
  t.is(result.campaignId, null);
  result.topic.should.equal(hardcodedTopicBroadcastEntry.fields.topic);
  result.message.text.should.equal(hardcodedTopicBroadcastEntry.fields.message);
  result.message.template.should.equal('rivescript');
});
