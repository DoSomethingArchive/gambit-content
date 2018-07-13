'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const underscore = require('underscore');

const stubs = require('../../../../utils/stubs');
const helpers = require('../../../../../lib/helpers');

const broadcastFactory = require('../../../../utils/factories/broadcast');

const broadcast = broadcastFactory.getValidCampaignBroadcast();

chai.should();
chai.use(sinonChai);

// module to be tested
const getBroadcast = require('../../../../../lib/middleware/broadcasts/single/broadcast-get');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.req.params = {
    broadcastId: stubs.getBroadcastId(),
  };
  t.context.res = httpMocks.createResponse();
  sandbox.spy(t.context.res, 'send');
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('getBroadcast should inject a broadcast property set to getById result', async (t) => {
  const next = sinon.stub();
  const middleware = getBroadcast();
  sandbox.stub(helpers.broadcast, 'getById')
    .returns(Promise.resolve(broadcast));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.broadcast.getById.should.have.been.calledWith(t.context.req.params.broadcastId);
  t.context.res.send.should.have.been.calledWith({ data: broadcast });
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('getBroadcast should sendErrorResponse if getById fails', async (t) => {
  const next = sinon.stub();
  const middleware = getBroadcast();
  const mockError = { message: 'Epic fail' };
  sandbox.stub(helpers.broadcast, 'getById')
    .returns(Promise.reject(mockError));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.broadcast.getById.should.have.been.calledWith(t.context.req.params.broadcastId);
  t.context.res.send.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, mockError);
});
