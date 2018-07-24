'use strict';

// libs
require('dotenv').config();
const Promise = require('bluebird');
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const logger = require('winston');
const rewire = require('rewire');
const underscore = require('underscore');

// app modules
const stubs = require('../../test/utils/stubs');
const stathat = require('../../lib/stathat');
const utilHelper = require('../../lib/helpers/util');
const contentfulAPI = require('contentful');
const broadcastContentfulFactory = require('../../test/utils/factories/contentful/broadcast');
const defaultTopicTriggerContentfulFactory = require('../../test/utils/factories/contentful/defaultTopicTrigger');
const textPostConfigContentfulFactory = require('../../test/utils/factories/contentful/textPostConfig');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const contentful = rewire('../../lib/contentful');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

// Stubs
const broadcastEntry = broadcastContentfulFactory.getValidCampaignBroadcast();
const defaultTopicTriggerEntry = defaultTopicTriggerContentfulFactory
  .getValidDefaultTopicTrigger();
const textPostConfigEntry = textPostConfigContentfulFactory.getValidTextPostConfig();
const campaignConfigIndexStub = stubs.contentful.getEntries('campaign');
const campaignConfigStub = stubs.contentful.getEntries('default-campaign').items[0];
const getEntriesStub = Promise.resolve({ items: [defaultTopicTriggerEntry] });
const failStub = Promise.reject({ status: 500 });
const contentfulAPIStub = {
  getEntries: () => {},
};

// Setup!
test.beforeEach(() => {
  stubs.stubLogger(sandbox, logger);
  sandbox.stub(stathat, 'postStat');
  sandbox.stub(contentfulAPI, 'createClient')
    .returns(contentfulAPIStub);
});

// Cleanup!
test.afterEach((t) => {
  // reset stubs, spies, and mocks
  sandbox.restore();
  t.context = {};

  // reset client state on each test
  contentful.__set__('client', undefined);
});

// createNewClient
test('createNewClient should create a new contentful client', () => {
  contentful.createNewClient();
  contentfulAPI.createClient.should.have.been.called;
  contentful.getClient().should.respondTo('getEntries');
});

// getClient
test('getClient should return the existing contentful client if already created', () => {
  const newClient = contentful.getClient();
  const sameClient = contentful.getClient();

  // test
  contentfulAPI.createClient.should.have.been.calledOnce;
  newClient.should.be.equal(sameClient);
});

// contentfulError
test('contentfulError should add the Contentful error prefix to the error object passed', () => {
  const prefix = contentful.__get__('ERROR_PREFIX');
  const errorObj = { message: 'tacos' };
  const error = contentful.contentfulError(errorObj);
  error.message.should.have.string(prefix);
});

// fetchByContentfulId
test('fetchByContentfulId should only get one item from the entries returned by contentful', async () => {
  sandbox.spy(underscore, 'first');
  contentful.__set__('client', {
    getEntries: sinon.stub().returns(getEntriesStub),
  });

  // test
  const entry = await contentful.fetchByContentfulId();
  underscore.first.should.have.been.called;
  entry.should.deep.equal(defaultTopicTriggerEntry);
});

test('fetchByContentfulId should throw NotFound if empty items returned by contentful', async () => {
  sandbox.spy(underscore, 'first');
  contentful.__set__('client', {
    getEntries: sinon.stub().returns(Promise.resolve({ items: [] })),
  });

  // test
  try {
    await contentful.fetchByContentfulId();
  } catch (error) {
    error.status.should.be.equal(404);
  }
  underscore.first.should.have.been.called;
});

test('fetchByContentfulId should reject with a contentfulError if unsuccessful', async () => {
  // setup
  sandbox.spy(contentful, 'contentfulError');
  contentful.__set__('client', {
    getEntries: sinon.stub().returns(failStub),
  });

  // test
  try {
    await contentful.fetchByContentfulId();
  } catch (error) {
    error.status.should.be.equal(500);
  }
  contentful.contentfulError.should.have.been.called;
});

// fetchByContentTypes
test('fetchByContentTypes should send contentful a query with contentTypes', async () => {
  const contentTypes = ['lannister', 'stark'];
  contentful.__set__('client', {
    getEntries: sinon.stub().returns(getEntriesStub),
  });
  const queryParams = { skip: 11, limit: 5 };
  const query = contentful.getQueryBuilder()
    .contentTypes(contentTypes)
    .skip(queryParams.skip)
    .limit(queryParams.limit)
    .orderByDescCreatedAt()
    .build();

  // test
  await contentful.fetchByContentTypes(contentTypes, queryParams);
  contentful.getClient().getEntries.getCall(0).args[0].should.be.eql(query);
});

test('fetchByContentTypes should call contentfulError when it fails', async (t) => {
  sandbox.spy(contentful, 'contentfulError');
  contentful.__set__('client', {
    getEntries: sinon.stub().returns(failStub),
  });

  // test
  await t.throws(contentful.fetchByContentTypes(['text']));
  contentful.contentfulError.should.have.been.called;
});

// getContentfulIdFromContentfulEntry
test('getContentfulIdFromContentfulEntry returns contentful entry id of given entry', () => {
  const result = contentful.getContentfulIdFromContentfulEntry(campaignConfigStub);
  result.should.equal(campaignConfigStub.sys.id);
});

// getContentTypeFromContentfulEntry
test('getContentTypeFromContentfulEntry returns content type name of given entry', () => {
  const result = contentful.getContentTypeFromContentfulEntry(campaignConfigStub);
  result.should.equal(campaignConfigStub.sys.contentType.sys.id);
});

// getAttachmentsFromContentfulEntry
test('getAttachmentsFromContentfulEntry returns value of given entry name field', () => {
  const result = contentful.getAttachmentsFromContentfulEntry(broadcastEntry);
  const attachment = broadcastEntry.fields.attachments[0].fields.file;
  result.should.deep.equal([attachment]);
});

// getNameTextFromContentfulEntry
test('getNameTextFromContentfulEntry returns value of given entry name field', () => {
  const result = contentful.getNameTextFromContentfulEntry(textPostConfigEntry);
  result.should.equal(textPostConfigEntry.fields.name);
});

// parseGetEntriesResponse
test('parseGetEntriesResponse returns object with meta and data properties', () => {
  const stubMeta = {
    pagination: {
      total: campaignConfigIndexStub.items.length,
    },
  };
  sandbox.stub(utilHelper, 'getMeta')
    .returns(stubMeta);
  const result = contentful.parseGetEntriesResponse(campaignConfigIndexStub);
  result.data.should.deep.equal(campaignConfigIndexStub.items);
  result.meta.should.deep.equal(stubMeta);
});
