'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const logger = require('winston');
const Promise = require('bluebird');
const rewire = require('rewire');

const stubs = require('../../utils/stubs');
const stathat = require('../../../lib/stathat');
const helpers = require('../../../lib/helpers');
const config = require('../../../config/middleware/chatbot/map-request-params');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const mapRequestParams = rewire('../../../lib/middleware/map-request-params');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

// stubs
const stathatStub = () => true;
const getKeywordStub = Promise.resolve(stubs.getJSONstub('fetchKeyword'));
const getBroadcastStub = Promise.resolve(stubs.getJSONstub('fetchBroadcast'));

// Setup!
test.beforeEach((t) => {
  stubs.stubLogger(sandbox, logger);
  sandbox.stub(stathat, 'postStat').returns(stathatStub);
  sandbox.stub(helpers, 'getKeyword').returns(getKeywordStub);
  sandbox.stub(helpers, 'getBroadcast').returns(getBroadcastStub);

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

test('mapRequestParams should strip emojies from the args param when mapping', async (t) => {
  // setup
  const next = sinon.stub();
  const middleware = mapRequestParams(config);
  const emojiStripParam = config.emojiStripParam;
  const toLowerCaseParam = config.lowercaseParam;
  const prefix = 'catdot!';
  const emojiStripValue = `${prefix}🐱🐶`;
  const toLowerCaseValue = 'DOSOMETHING';
  t.context.req[config.containerProperty][emojiStripParam] = emojiStripValue;
  t.context.req[config.containerProperty][toLowerCaseParam] = toLowerCaseValue;

  // test
  await middleware(t.context.req, t.context.res, next);
  t.context.req[config.paramsMap[emojiStripParam]].should.be.equal(prefix);
  t.context.req[config.paramsMap[toLowerCaseParam]].should.be.equal(toLowerCaseValue.toLowerCase());
  next.should.have.been.called;
});

test('mapRequestParams should populate the contentful broadcast object and campaignId when it gets a broadcast_id', async (t) => {
  // setup
  const next = sinon.stub();
  const middleware = mapRequestParams(config);
  const broadcastObject = stubs.getJSONstub('fetchBroadcast');
  const campaign = broadcastObject.fields.campaign.fields;
  t.context.req[config.containerProperty].broadcast_id = stubs.getBroadcastId();

  // test
  await middleware(t.context.req, t.context.res, next);
  t.context.req.contentfulObjects.broadcast.should.be.equal(broadcastObject);
  t.context.req.campaignId.should.be.equal(campaign.campaignId);
  next.should.have.been.called;
});

test('mapRequestParams should populate the contentful keyword object and campaignId from the keyword if no broadcast_id is found', async (t) => {
  // setup
  const next = sinon.stub();
  const middleware = mapRequestParams(config);
  const keywordObject = stubs.getJSONstub('fetchKeyword');
  const campaign = keywordObject.fields.campaign.fields;
  t.context.req[config.containerProperty].keyword = stubs.getKeyword();

  // test
  await middleware(t.context.req, t.context.res, next);
  t.context.req.contentfulObjects.keyword.should.be.equal(keywordObject);
  t.context.req.campaignId.should.be.equal(campaign.campaignId);
  next.should.have.been.called;
});
