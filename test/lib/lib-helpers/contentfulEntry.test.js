'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contentful = require('../../../lib/contentful');
const stubs = require('../../utils/stubs');
const askYesNoEntryFactory = require('../../utils/factories/contentful/askYesNo');
const messageFactory = require('../../utils/factories/contentful/message');

// stubs
const stubEntryDate = Date.now();
const stubEntry = askYesNoEntryFactory.getValidAskYesNo(stubEntryDate);
const stubEntryId = stubs.getContentfulId();
const stubContentType = stubs.getTopicContentType();
const stubNameText = stubs.getBroadcastName();

// Module to test
const contentfulEntryHelper = require('../../../lib/helpers/contentfulEntry');

chai.should();
chai.use(sinonChai);


const sandbox = sinon.sandbox.create();

test.beforeEach(() => {
  sandbox.stub(contentful, 'getContentfulIdFromContentfulEntry')
    .returns(stubEntryId);
  sandbox.stub(contentful, 'getNameTextFromContentfulEntry')
    .returns(stubNameText);
});

test.afterEach(() => {
  sandbox.restore();
});

// getSummaryFromContentfulEntry
test('getSummaryFromContentfulEntry returns an object with name and type properties', () => {
  sandbox.stub(contentful, 'getContentTypeFromContentfulEntry')
    .returns(stubContentType);
  const result = contentfulEntryHelper.getSummaryFromContentfulEntry(stubEntry);
  result.id.should.equal(stubEntryId);
  result.type.should.equal(stubContentType);
  result.name.should.equal(stubNameText);
  result.createdAt.should.equal(stubEntryDate);
  result.updatedAt.should.equal(stubEntryDate);
});

// isBroadcastable
test('isBroadcastable is returns whether contentType is broadcastable', (t) => {
  const askYesNoEntry = askYesNoEntryFactory.getValidAskYesNo();
  t.truthy(contentfulEntryHelper.isBroadcastable(askYesNoEntry));
  const messageEntry = messageFactory.getValidMessage();
  t.falsy(contentfulEntryHelper.isBroadcastable(messageEntry));
});

// isDefaultTopicTrigger
test('isDefaultTopicTrigger is falsy if not contentful.isContentType', (t) => {
  sandbox.stub(contentful, 'isContentType')
    .returns(false);
  t.falsy(contentfulEntryHelper.isDefaultTopicTrigger(stubEntry));
});

test('isDefaultTopicTrigger is truthy if contentful.isContentType', (t) => {
  sandbox.stub(contentful, 'isContentType')
    .returns(true);
  t.truthy(contentfulEntryHelper.isDefaultTopicTrigger(stubEntry));
});

// isMessage
test('isMessage returns whether content type is message', (t) => {
  const messageEntry = messageFactory.getValidMessage();
  t.truthy(contentfulEntryHelper.isMessage(messageEntry));
  t.falsy(contentfulEntryHelper.isMessage(stubEntry));
});
