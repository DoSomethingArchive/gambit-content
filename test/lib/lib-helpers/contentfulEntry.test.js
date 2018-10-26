'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contentful = require('../../../lib/contentful');
const helpers = require('../../../lib/helpers');
const stubs = require('../../utils/stubs');

const config = require('../../../config/lib/helpers/contentfulEntry');

// Contentful factories
const askYesNoEntryFactory = require('../../utils/factories/contentful/askYesNo');
const autoReplyFactory = require('../../utils/factories/contentful/autoReply');
const autoReplyBroadcastFactory = require('../../utils/factories/contentful/autoReplyBroadcast');
const defaultTopicTriggerFactory = require('../../utils/factories/contentful/defaultTopicTrigger');
const messageFactory = require('../../utils/factories/contentful/message');
// Parsed factories
const broadcastFactory = require('../../utils/factories/broadcast');

// Contentful stubs
const askYesNoEntry = askYesNoEntryFactory.getValidAskYesNo();
const autoReplyEntry = autoReplyFactory.getValidAutoReply();
const autoReplyBroadcastEntry = autoReplyBroadcastFactory.getValidAutoReplyBroadcast();
const defaultTopicTriggerEntry = defaultTopicTriggerFactory.getValidDefaultTopicTrigger();
const messageEntry = messageFactory.getValidMessage();
const fetchTopicResult = { id: stubs.getContentfulId() };
// Parsed stubs
const broadcast = broadcastFactory.getValidBroadcast();

// Module to test
const contentfulEntryHelper = require('../../../lib/helpers/contentfulEntry');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.afterEach(() => {
  sandbox.restore();
});

// fetch
test('fetch returns parsed contentful.fetch result', async () => {
  const query = { content_type: 'campaign' };
  sandbox.stub(contentful, 'fetchEntries')
    .returns(Promise.resolve({ data: [askYesNoEntry] }));
  const parsedResponse = { raw: askYesNoEntry, parsed: broadcast };
  sandbox.stub(contentfulEntryHelper, 'formatForApi')
    .returns(Promise.resolve(parsedResponse));

  const result = await contentfulEntryHelper.fetch(query);
  contentful.fetchEntries.should.have.been.calledWith(query);
  contentfulEntryHelper.formatForApi.should.have.been.calledWith(askYesNoEntry);
  result.data.should.deep.equal([parsedResponse]);
});

// fetchById
test('fetchById returns parsed contentful.fetchByContentfulId result', async () => {
  sandbox.stub(contentful, 'fetchByContentfulId')
    .returns(Promise.resolve(askYesNoEntry));
  const parsedResponse = { raw: askYesNoEntry, parsed: broadcast };
  sandbox.stub(contentfulEntryHelper, 'formatForApi')
    .returns(Promise.resolve(parsedResponse));

  const result = await contentfulEntryHelper.fetchById(broadcast.id);
  contentful.fetchByContentfulId.should.have.been.calledWith(broadcast.id);
  contentfulEntryHelper.formatForApi.should.have.been.calledWith(askYesNoEntry);
  result.should.deep.equal(parsedResponse);
});

// formatForApi
test('formatForApi eventually returns an object with raw and parsed properties', async () => {
  const mockSys = { sys: { id: broadcast.id } };
  sandbox.stub(contentfulEntryHelper, 'formatSys')
    .returns(mockSys);
  sandbox.stub(contentfulEntryHelper, 'parseContentfulEntry')
    .returns(Promise.resolve(broadcast));

  const result = await contentfulEntryHelper.formatForApi(askYesNoEntry);
  result.raw.sys.should.deep.equal(mockSys);
  result.raw.fields.should.deep.equal(askYesNoEntry.fields);
  result.parsed.should.deep.equal(broadcast);
});

// formatSys
test('formatSys returns object with properties from contentfulEntry.sys', () => {
  const result = contentfulEntryHelper.formatSys(askYesNoEntry);
  result.should.deep.equal({
    id: askYesNoEntry.sys.id,
    contentType: askYesNoEntry.sys.contentType,
    createdAt: askYesNoEntry.sys.createdAt,
    updatedAt: askYesNoEntry.sys.updatedAt,
  });
});

// getMessageTemplate
test('getMessageTemplate should call topic.getById to set topic if topic reference field saved', async () => {
  const messageTemplate = stubs.getRandomWord();
  const messageText = stubs.getRandomMessageText();
  const messageAttachments = [{ name: 'Tyrion' }, { name: 'Cersei' }];
  sandbox.stub(contentful, 'getTextFromMessage')
    .returns(messageText);
  sandbox.stub(contentful, 'getAttachmentsFromContentfulEntry')
    .returns(messageAttachments);
  sandbox.stub(helpers.topic, 'getById')
    .returns(fetchTopicResult);

  const result = await contentfulEntryHelper
    .getMessageTemplate(autoReplyBroadcastEntry, messageTemplate);
  helpers.topic.getById.should.have.been.calledWith(autoReplyBroadcastEntry.fields.topic.sys.id);
  result.text.should.equal(messageText);
  result.attachments.should.deep.equal(messageAttachments);
  result.topic.should.deep.equal(fetchTopicResult);
  result.template.should.equal(messageTemplate);
});

test('getMessageTemplate result should be empty object if contentfulEntry undefined', async () => {
  const result = await contentfulEntryHelper
    .getMessageTemplate(null, stubs.getRandomWord());
  result.should.deep.equal({});
});

test('getMessageTemplate should not call topic.getById if topic reference field undefined', async () => {
  sandbox.stub(helpers.topic, 'getById')
    .returns(fetchTopicResult);

  const result = await contentfulEntryHelper
    .getMessageTemplate(askYesNoEntry, stubs.getRandomWord());
  helpers.topic.getById.should.not.have.been.called;
  result.topic.should.deep.equal({});
});

// getSummaryFromContentfulEntry
test('getSummaryFromContentfulEntry returns an object with name and type properties', () => {
  const stubEntryDate = Date.now();
  const stubEntry = askYesNoEntryFactory.getValidAskYesNo(stubEntryDate);
  const stubEntryId = stubs.getContentfulId();
  const stubContentType = stubs.getTopicContentType();
  const stubNameText = stubs.getBroadcastName();
  sandbox.stub(contentful, 'getContentTypeFromContentfulEntry')
    .returns(stubContentType);

  const result = contentfulEntryHelper.getSummaryFromContentfulEntry(stubEntry);
  result.id.should.equal(stubEntryId);
  result.type.should.equal(stubContentType);
  result.name.should.equal(stubNameText);
  result.createdAt.should.equal(stubEntryDate);
  result.updatedAt.should.equal(stubEntryDate);
});

// getTopicTemplates
test('getTopicTemplates returns an object with templates values if content type config has templates', async () => {
  const result = await contentfulEntryHelper.getTopicTemplates(autoReplyEntry);
  result.autoReply.text.should.equal(autoReplyEntry.fields.autoReply);
});

test('getTopicTemplates returns an empty object if content type config does not have templates', async () => {
  const result = await contentfulEntryHelper
    .getTopicTemplates(autoReplyBroadcastEntry);
  result.should.deep.equal({});
});

test('getTopicTemplates should call topic.getById to set saidYes and saidNo topics', async () => {
  sandbox.stub(helpers.topic, 'getById')
    .returns(fetchTopicResult);
  const result = await contentfulEntryHelper
    .getTopicTemplates(askYesNoEntry);
  result.saidYes.topic.should.deep.equal(fetchTopicResult);
  result.saidNo.topic.should.deep.equal(fetchTopicResult);
});

// isAskYesNo
test('isAskYesNo returns whether content type is askYesNo', (t) => {
  t.truthy(contentfulEntryHelper.isAskYesNo(askYesNoEntry));
  t.falsy(contentfulEntryHelper.isAskYesNo(autoReplyEntry));
});

// isAutoReply
test('isAutoReply returns whether content type is autoReply', (t) => {
  t.falsy(contentfulEntryHelper.isAutoReply(askYesNoEntry));
  t.truthy(contentfulEntryHelper.isAutoReply(autoReplyEntry));
});

// isBroadcastable
test('isBroadcastable returns whether content type is broadcastable', (t) => {
  t.truthy(contentfulEntryHelper.isBroadcastable(askYesNoEntry));
  t.falsy(contentfulEntryHelper.isBroadcastable(messageEntry));
});

// isDefaultTopicTrigger
test('isDefaultTopicTrigger returns whether content type is defaultTopicTrigger', (t) => {
  t.truthy(contentfulEntryHelper.isDefaultTopicTrigger(defaultTopicTriggerEntry));
  t.falsy(contentfulEntryHelper.isDefaultTopicTrigger(messageEntry));
});

// isMessage
test('isMessage returns whether content type is message', (t) => {
  t.truthy(contentfulEntryHelper.isMessage(messageEntry));
  t.falsy(contentfulEntryHelper.isMessage(autoReplyEntry));
});

// isTransitionTemplate
test('isTransitionTemplate returns whether contentType config for templateName is a transition field', (t) => {
  const askVotingPlanStatus = config.contentTypes.askVotingPlanStatus;
  const autoReply = config.contentTypes.autoReply;
  let templateName = askVotingPlanStatus.templates.votingPlanStatusVoted.name;
  t.truthy(contentfulEntryHelper
    .isTransitionTemplate(askVotingPlanStatus.type, templateName));
  templateName = autoReply.templates.autoReply.name;
  t.falsy(contentfulEntryHelper
    .isTransitionTemplate(autoReply.type, templateName));
});
