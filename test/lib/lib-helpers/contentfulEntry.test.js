'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contentful = require('../../../lib/contentful');
const stubs = require('../../utils/stubs');
const askYesNoEntryFactory = require('../../utils/factories/contentful/askYesNo');

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
  sandbox.stub(contentful, 'getContentTypeFromContentfulEntry')
    .returns(stubContentType);
  sandbox.stub(contentful, 'getNameTextFromContentfulEntry')
    .returns(stubNameText);
});

test.afterEach(() => {
  sandbox.restore();
});

// getNameInfoFromContentfulEntry
test('getNameInfoFromContentfulEntry returns an object with name and type properties', () => {
  const result = contentfulEntryHelper.getNameInfoFromContentfulEntry(stubEntry);
  result.id.should.equal(stubEntryId);
  result.type.should.equal(stubContentType);
  result.name.should.equal(stubNameText);
  result.createdAt.should.equal(stubEntryDate);
  result.updatedAt.should.equal(stubEntryDate);
});
