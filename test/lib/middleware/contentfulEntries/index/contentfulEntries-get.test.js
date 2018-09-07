'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const underscore = require('underscore');

const helpers = require('../../../../../lib/helpers');
const stubs = require('../../../../utils/stubs');
const askYesNoFactory = require('../../../../utils/factories/contentful/askYesNo');

chai.should();
chai.use(sinonChai);

// module to be tested
const getContentfulEntries = require('../../../../../lib/middleware/contentfulEntries/index/contentfulEntries-get');

const sandbox = sinon.sandbox.create();

const contentfulEntries = [askYesNoFactory.getValidAskYesNo(), askYesNoFactory.getValidAskYesNo()];
const fetchResult = stubs.contentful.getFetchByContentTypesResultWithArray(contentfulEntries);

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  sandbox.stub(helpers.response, 'sendIndexData')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('getContentfulEntries should send errorResponse if content_type query param not set', async (t) => {
  const next = sinon.stub();
  const middleware = getContentfulEntries();
  sandbox.stub(helpers.contentfulEntry, 'fetch')
    .returns(Promise.resolve(fetchResult));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.contentfulEntry.fetch.should.not.have.been.called;
  helpers.response.sendIndexData.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.called;
});

test('getContentfulEntries should call helpers.contentfulEntry.fetch result without apiKey query param', async (t) => {
  const next = sinon.stub();
  const middleware = getContentfulEntries();
  sandbox.stub(helpers.contentfulEntry, 'fetch')
    .returns(Promise.resolve(fetchResult));
  const contentType = 'askYesNo';
  t.context.req.query = {
    content_type: contentType,
    apiKey: 'whatever',
  };

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.contentfulEntry.fetch.should.have.been.calledWith({ content_type: contentType });
  helpers.response.sendIndexData
    .should.have.been.calledWith(t.context.res, fetchResult.data, fetchResult.meta);
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('getContentfulEntries should send errorResponse if helpers.contentfulEntry.fetch fails', async (t) => {
  const next = sinon.stub();
  const middleware = getContentfulEntries();
  const error = new Error('o noes');
  sandbox.stub(helpers.contentfulEntry, 'fetch')
    .returns(Promise.reject(error));
  t.context.req.query = {
    content_type: 'askYesNo',
  };

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.contentfulEntry.fetch.should.have.been.called;
  helpers.response.sendIndexData.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, error);
});
