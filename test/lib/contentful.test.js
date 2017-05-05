'use strict';

require('dotenv').config();
const Promise = require('bluebird');
const test = require('ava');
const chai = require('chai');
const stubs = require('../../test/utils/stubs');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const stathat = require('../../lib/stathat');
const logger = require('winston');
const contentfulAPI = require('contentful');
const rewire = require('rewire');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const contentful = rewire('../../lib/contentful');

const sandbox = sinon.sandbox.create();

// Stub functions
const getEntriesFailArg = 'fail';
const entriesResponseStub = Promise.resolve(stubs.contentful.getEntries('keywords'));
const entriesResponseStubFail = Promise.reject({ status: 500 });
const contentfulAPIStub = {
  getEntries: () => {},
};

// Setup!
test.beforeEach((t) => {
  sandbox.stub(logger, 'error');
  sandbox.stub(logger, 'debug');
  sandbox.stub(stathat, 'postStat');
  sandbox.stub(contentfulAPIStub, 'getEntries');

  contentfulAPIStub.getEntries.withArgs(getEntriesFailArg).returns(entriesResponseStubFail);
  contentfulAPIStub.getEntries.returns(entriesResponseStub);

  sandbox.stub(contentfulAPI, 'createClient')
    .returns(contentfulAPIStub);

  sandbox.spy(contentful, 'getFirstItemFromArray');
  sandbox.spy(contentful, 'contentfulError');
  sandbox.spy(contentful, 'fetchSingleEntry');
  sandbox.spy(contentful, 'fetchCampaign');
  sandbox.spy(contentful, 'fetchKeywords');

  // setup req, res mocks
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
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
test('createNewClient should create a new contentful client by calling contentful.createClient',
() => {
  contentful.createNewClient();
  contentfulAPI.createClient.should.have.been.called;
});

// getClient
test('getClient should return the existing contentful client if already created', () => {
  const newClient = contentful.getClient();
  const sameClient = contentful.getClient();

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

// fetchSingleEntry
test('fetchSingleEntry should only get one item from the entries returned by contentful',
async () => {
  await contentful.fetchSingleEntry({/* any Query */});
  contentful.getClient().getEntries.should.have.been.called;
  contentful.getFirstItemFromArray.should.have.been.called;
});

test('fetchSingleEntry should return an object if successful', async () => {
  const entry = await contentful.fetchSingleEntry({/* any Query */});
  entry.should.be.an('object');
  entry.should.not.be.an('array');
});

test('fetchSingleEntry should reject with a contentfulError if unsuccessful', async () => {
  try {
    await contentful.fetchSingleEntry('fail');
  } catch (error) {
    // We don't care about this error here, but we have to catch this rejected promise
  }
  contentful.contentfulError.should.have.been.called;
});

// fetchBroadcast
test('fetchBroadcast should send contentful a query with content_type of broadcast', async () => {
  const query = contentful.getQueryBuilder().type('broadcast').broadcast(1260764).build();
  await contentful.fetchBroadcast(1260764);
  contentful.fetchSingleEntry.getCall(0).args[0].should.be.eql(query);
});

// fetchCampaign
test('fetchCampaign should send contentful a query with content_type of campaign', async () => {
  const query = contentful.getQueryBuilder().type('campaign').campaign(2299).build();
  await contentful.fetchCampaign(2299);
  contentful.fetchSingleEntry.getCall(0).args[0].should.be.eql(query);
});

// fetchKeyword
test('fetchKeyword should send contentful a query with content_type of keyword', async () => {
  const query = contentful.getQueryBuilder().type('keyword').keyword('bookbot').build();
  await contentful.fetchKeyword('bookbot');
  contentful.fetchSingleEntry.getCall(0).args[0].should.be.eql(query);
});

// fetchKeywords
test('fetchKeywords should send contentful a query with content_type of keyword and current env', async () => {
  const query = contentful.getQueryBuilder().type('keyword').env(process.env.NODE_ENV).build();
  await contentful.fetchKeywords();
  contentful.getClient().getEntries.getCall(0).args[0].should.be.eql(query);
});

// fetchCampaignIdsWithKeywords
// TODO: There are many branches in this function, we should trigger them all
test('fetchCampaignIdsWithKeywords should retrieve all contentful keywords', async () => {
  await contentful.fetchCampaignIdsWithKeywords();
  contentful.fetchKeywords.should.have.been.called;
});
