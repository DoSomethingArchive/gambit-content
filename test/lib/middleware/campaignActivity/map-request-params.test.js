'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const logger = require('winston');
const rewire = require('rewire');

const stubs = require('../../../utils/stubs');
const config = require('../../../../config/lib/middleware/campaignActivity/map-request-params');

const userId = stubs.getUserId();
const campaignId = stubs.getCampaignId();

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const mapRequestParams = rewire('../../../../lib/middleware/campaignActivity/map-request-params');

// sinon sandbox object
const sandbox = sinon.sandbox.create();


// Setup!
test.beforeEach((t) => {
  stubs.stubLogger(sandbox, logger);

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

test('mapRequestParams should populate the req object with variables defined in config', async (t) => {
  // setup
  const next = sinon.stub();
  const middleware = mapRequestParams(config);
  const paramsMap = config.paramsMap;
  const bodyParams = Object.keys(paramsMap);
  t.context.req.body = {
    userId,
    campaignId,
  };

  // test
  await middleware(t.context.req, t.context.res, next);
  bodyParams.forEach((bodyParamName) => {
    t.context.req.should.have.property(paramsMap[bodyParamName]);
  });
  t.context.req.userId.should.be.equal(userId);
  t.context.req.campaignId.should.be.equal(campaignId);
  next.should.have.been.called;
});
