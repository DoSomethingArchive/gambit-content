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
const broadcastFactory = require('../../../../utils/factories/broadcast');

chai.should();
chai.use(sinonChai);

// module to be tested
const getBroadcasts = require('../../../../../lib/middleware/broadcasts/index/broadcasts-get');

const sandbox = sinon.sandbox.create();

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

test('getBroadcasts should send helpers.broadcast.fetch result', async (t) => {
  const next = sinon.stub();
  const middleware = getBroadcasts();
  const firstBroadcast = broadcastFactory.getValidCampaignBroadcast();
  const secondBroadcast = broadcastFactory.getValidCampaignBroadcast();
  const broadcasts = [firstBroadcast, secondBroadcast];
  const fetchResult = stubs.contentful.getFetchByContentTypesResultWithArray(broadcasts);
  sandbox.stub(helpers.broadcast, 'fetch')
    .returns(Promise.resolve(fetchResult));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.broadcast.fetch.should.have.been.called;
  helpers.response.sendIndexData
    .should.have.been.calledWith(t.context.res, fetchResult.data, fetchResult.meta);
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('getBroadcasts should send errorResponse if helpers.broadcast.fetch fails', async (t) => {
  const next = sinon.stub();
  const middleware = getBroadcasts();
  const error = new Error('o noes');
  sandbox.stub(helpers.broadcast, 'fetch')
    .returns(Promise.reject(error));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.broadcast.fetch.should.have.been.called;
  helpers.response.sendIndexData.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, error);
});
