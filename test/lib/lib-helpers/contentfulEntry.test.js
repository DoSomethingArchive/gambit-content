'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contentful = require('../../../lib/contentful');
const helpers = require('../../../lib/helpers');
const stubs = require('../../utils/stubs');
const askYesNoEntryFactory = require('../../utils/factories/contentful/askYesNo');
const autoReplyFactory = require('../../utils/factories/contentful/autoReply');
const autoReplyBroadcastFactory = require('../../utils/factories/contentful/autoReplyBroadcast');
const defaultTopicTriggerFactory = require('../../utils/factories/contentful/defaultTopicTrigger');
const messageFactory = require('../../utils/factories/contentful/message');

// stubs
const askYesNoEntry = askYesNoEntryFactory.getValidAskYesNo();
const autoReplyEntry = autoReplyFactory.getValidAutoReply();
const autoReplyBroadcastEntry = autoReplyBroadcastFactory.getValidAutoReplyBroadcast();
const defaultTopicTriggerEntry = defaultTopicTriggerFactory.getValidDefaultTopicTrigger();
const messageEntry = messageFactory.getValidMessage();
const fetchTopicResult = { id: stubs.getContentfulId() };

// Module to test
const contentfulEntryHelper = require('../../../lib/helpers/contentfulEntry');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.afterEach(() => {
  sandbox.restore();
});

// getMessageTemplateFromContentfulEntryAndTemplateName
test('getMessageTemplateFromContentfulEntryAndTemplateName should call topic.getById to set topic if topic reference field saved', async () => {
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
    .getMessageTemplateFromContentfulEntryAndTemplateName(autoReplyBroadcastEntry, messageTemplate);
  helpers.topic.getById.should.have.been.calledWith(autoReplyBroadcastEntry.fields.topic.sys.id);
  result.text.should.equal(messageText);
  result.attachments.should.deep.equal(messageAttachments);
  result.topic.should.deep.equal(fetchTopicResult);
  result.template.should.equal(messageTemplate);
});

test('getMessageTemplateFromContentfulEntryAndTemplateName should not call topic.getById if topic reference field undefined', async () => {
  sandbox.stub(helpers.topic, 'getById')
    .returns(fetchTopicResult);

  const result = await contentfulEntryHelper
    .getMessageTemplateFromContentfulEntryAndTemplateName(askYesNoEntry, stubs.getRandomWord());
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
