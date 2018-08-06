'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contentful = require('../../../lib/contentful');
const helpers = require('../../../lib/helpers');
const stubs = require('../../utils/stubs');
const askChangeTopicEntryFactory = require('../../utils/factories/contentful/askChangeTopic');
const broadcastEntryFactory = require('../../utils/factories/contentful/broadcast');
const broadcastFactory = require('../../utils/factories/broadcast');

// stubs
const attachments = [stubs.getAttachment()];
const broadcastId = stubs.getContentfulId();
const broadcastEntry = broadcastEntryFactory.getValidCampaignBroadcast();
const broadcast = broadcastFactory.getValidCampaignBroadcast();
const broadcastName = stubs.getBroadcastName();
const broadcastType = 'askChangeTopic';
const campaignId = stubs.getCampaignId();
const legacyBroadcastType = 'broadcast';

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
  const contentTypes = [broadcastType];
  const entries = [broadcastEntry];
  const fetchEntriesResult = stubs.contentful.getFetchByContentTypesResultWithArray(entries);
  sandbox.stub(broadcastHelper, 'getContentTypes')
    .returns(contentTypes);
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.resolve(fetchEntriesResult));
  sandbox.stub(broadcastHelper, 'parseBroadcastFromContentfulEntry')
    .returns(Promise.resolve(broadcast));
  sandbox.stub(contentful, 'getContentTypeFromContentfulEntry')
    .returns(broadcastType);

  const result = await broadcastHelper.fetch();

  contentful.fetchByContentTypes.should.have.been.calledWith(contentTypes);
  // TODO: Why is this failing with broadcastHelper.parseBroadcastFromContentfulEntry not function
  // fetchEntriesResult.data.forEach((entry) => {
  //   broadcastHelper.parseBroadcastFromContentfulEntry.should.have.been.called();
  // });
  result.data.should.deep.equal([broadcast]);
});

test('fetch throws if contentful.fetchByContentTypes fails', async (t) => {
  const error = new Error('epic fail');
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.reject(error));
  sandbox.stub(broadcastHelper, 'parseBroadcastFromContentfulEntry')
    .returns(Promise.resolve(broadcast));

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
  sandbox.stub(contentful, 'getContentTypeFromContentfulEntry')
    .returns(broadcastType);

  const result = await broadcastHelper.fetchById(broadcastId);
  contentful.fetchByContentfulId.should.have.been.calledWith(broadcastId);
  broadcastHelper.parseBroadcastFromContentfulEntry.should.have.been.calledWith(fetchEntryResult);
  result.should.deep.equal(broadcast);
});


// getById
test('getById returns broadcasts cache if set', async () => {
  sandbox.stub(helpers.cache.broadcasts, 'get')
    .returns(Promise.resolve(broadcast));
  sandbox.stub(broadcastHelper, 'fetchById')
    .returns(Promise.resolve(broadcast));

  const result = await broadcastHelper.getById(broadcastId);
  helpers.cache.broadcasts.get.should.have.been.calledWith(broadcastId);
  broadcastHelper.fetchById.should.not.have.been.called;
  result.should.deep.equal(broadcast);
});

test('getById returns fetchById and sets cache if cache not set', async () => {
  sandbox.stub(helpers.cache.broadcasts, 'get')
    .returns(Promise.resolve(null));
  sandbox.stub(broadcastHelper, 'fetchById')
    .returns(Promise.resolve(broadcast));

  const result = await broadcastHelper.getById(broadcastId);
  helpers.cache.broadcasts.get.should.have.been.calledWith(broadcastId);
  broadcastHelper.fetchById.should.have.been.calledWith(broadcastId);
  result.should.deep.equal(broadcast);
});

test('getById returns fetchById if resetCache arg is true', async () => {
  sandbox.stub(helpers.cache.broadcasts, 'get')
    .returns(Promise.resolve(null));
  sandbox.stub(broadcastHelper, 'fetchById')
    .returns(Promise.resolve(broadcast));

  const result = await broadcastHelper.getById(broadcastId, true);
  helpers.cache.broadcasts.get.should.not.have.been.called;
  broadcastHelper.fetchById.should.have.been.calledWith(broadcastId);
  result.should.deep.equal(broadcast);
});

// parseBroadcastMessageFromContentfulEntryAndTemplateName
test('parseBroadcastMessageFromContentfulEntryAndTemplateName returns null if contentfulEntry does not have broadcast set', (t) => {
  const result = broadcastHelper
    .parseBroadcastMessageFromContentfulEntryAndTemplateName(broadcastEntry);
  t.is(result, null);
});

test('parseBroadcastMessageFromContentfulEntryAndTemplateName returns getMessageTemplateFromContentfulEntryAndTemplateName', () => {
  const askChangeTopic = askChangeTopicEntryFactory.getValidAskChangeTopic();
  const templateName = stubs.getRandomWord();
  const messageTemplate = { text: stubs.getRandomMessageText(), template: templateName };
  sandbox.stub(helpers.contentfulEntry, 'getMessageTemplateFromContentfulEntryAndTemplateName')
    .returns(messageTemplate);
  sandbox.stub(contentful, 'getContentTypeFromContentfulEntry')
    .returns(broadcastType);

  const result = broadcastHelper
    .parseBroadcastMessageFromContentfulEntryAndTemplateName(askChangeTopic, templateName);
  result.should.equal(messageTemplate);
});

// parseLegacyBroadcastFromContentfulEntry
test('parseLegacyBroadcastFromContentfulEntry returns an object with null topic if campaign broadcast', async (t) => {
  sandbox.stub(contentful, 'getAttachmentsFromContentfulEntry')
    .returns(attachments);
  sandbox.stub(contentful, 'getContentTypeFromContentfulEntry')
    .returns(legacyBroadcastType);

  const result = await broadcastHelper.parseLegacyBroadcastFromContentfulEntry(broadcastEntry);
  contentful.getContentfulIdFromContentfulEntry.should.have.been.calledWith(broadcastEntry);
  result.id.should.equal(broadcastId);
  contentful.getContentTypeFromContentfulEntry.should.have.been.calledWith(broadcastEntry);
  result.type.should.equal(legacyBroadcastType);
  contentful.getNameTextFromContentfulEntry.should.have.been.calledWith(broadcastEntry);
  result.name.should.equal(broadcastName);
  t.is(result.topic, null);
  result.campaignId.should.equal(campaignId);
  result.message.text.should.equal(broadcastEntry.fields.message);
  result.message.template.should.equal(broadcastEntry.fields.template);
  contentful.getAttachmentsFromContentfulEntry.should.have.been.calledWith(broadcastEntry);
  result.message.attachments.should.equal(attachments);
});

test('parseLegacyBroadcastFromContentfulEntry returns an object with null campaignId if hardcoded topic broadcast', async (t) => {
  const hardcodedTopicBroadcastEntry = broadcastEntryFactory.getValidTopicBroadcast();
  sandbox.stub(contentful, 'getContentTypeFromContentfulEntry')
    .returns(legacyBroadcastType);

  const result = await broadcastHelper
    .parseLegacyBroadcastFromContentfulEntry(hardcodedTopicBroadcastEntry);
  contentful.getContentfulIdFromContentfulEntry
    .should.have.been.calledWith(hardcodedTopicBroadcastEntry);
  result.id.should.equal(broadcastId);
  result.type.should.equal(legacyBroadcastType);
  contentful.getNameTextFromContentfulEntry
    .should.have.been.calledWith(hardcodedTopicBroadcastEntry);
  result.name.should.equal(broadcastName);
  t.is(result.campaignId, null);
  result.topic.should.equal(hardcodedTopicBroadcastEntry.fields.topic);
  result.message.text.should.equal(hardcodedTopicBroadcastEntry.fields.message);
  result.message.template.should.equal('rivescript');
});
