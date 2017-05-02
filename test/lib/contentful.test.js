'use strict';

require('dotenv').config();
const Promise = require('bluebird');
const test = require('ava');
const chai = require('chai');
// const expect = require('chai').expect;
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
const clientFailObject = { space: 'fail', accessToken: 'fail' };
const entriesResponseStub = () => Promise.resolve(stubs.getEntries());
const entriesResponseStubFail = () => Promise.reject({ status: 500 });
const getEntriesStub = sinon.stub()
  .callsFake(entriesResponseStub)
  .withArgs(clientFailObject)
  .callsFake(entriesResponseStubFail);
const contentfulAPIStub = {
  getEntries: getEntriesStub,
};

// Setup!
test.beforeEach((t) => {
  sandbox.stub(logger, 'error');
  sandbox.stub(logger, 'debug');
  sandbox.stub(stathat, 'postStat');
  sandbox.stub(contentfulAPI, 'createClient')
    .returns(contentfulAPIStub);

  // setup req, res mocks
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

// Cleanup!
test.afterEach((t) => {
  // reset stubs, spies, and mocks
  sandbox.restore();
  t.context = {};
});

test('createNewClient', () => {
  const client = contentful.createNewClient();
  contentfulAPI.createClient.should.have.been.called;
  client.should.respondTo('getEntries');
});

test('getClient should not call createClient if client exists', () => {
  const client = contentful.getClient();
  contentfulAPI.createClient.should.not.have.been.called;
  client.should.respondTo('getEntries');
});

test('getClient should call createClient if client doesn\'t exist', () => {
  const restore = contentful.__set__('client', undefined);
  const client = contentful.getClient();
  contentfulAPI.createClient.should.have.been.called;
  client.should.respondTo('getEntries');
  restore();
});

test('contentfulError', () => {
  const errorObj = { message: 'tacos' };
  const error = contentful.contentfulError(errorObj);
  error.message.should.have.string(errorObj.message);
});
