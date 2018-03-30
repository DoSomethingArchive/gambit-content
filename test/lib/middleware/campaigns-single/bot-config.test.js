'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const underscore = require('underscore');

const stubs = require('../../../utils/stubs');
const helpers = require('../../../../lib/helpers');

chai.should();
chai.use(sinonChai);

// module to be tested
const getBotConfig = require('../../../../lib/middleware/campaigns-single/bot-config');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.req.campaignId = stubs.getCampaignId();
  t.context.req.campaign = stubs.getPhoenixCampaign();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('getBotConfig should inject a botConfig property with fetchByCampaignId result', async (t) => {
  const next = sinon.stub();
  const middleware = getBotConfig();
  const botConfigStub = { test: 'hello' };
  const postTypeStub = 'text';
  sandbox.stub(helpers.botConfig, 'fetchByCampaignId')
    .returns(Promise.resolve(botConfigStub));
  sandbox.stub(helpers.botConfig, 'parsePostTypeFromBotConfig')
    .returns(postTypeStub);

  // test
  await middleware(t.context.req, t.context.res, next);
  t.context.req.botConfig.should.deep.equal(botConfigStub);
  t.context.req.campaign.botConfig.postType.should.equal(postTypeStub);
  next.should.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('getBotConfig should sendErrorResponse if fetchByCampaignId fails', async (t) => {
  const next = sinon.stub();
  const middleware = getBotConfig();
  const mockError = { message: 'Epic fail' };
  sandbox.stub(helpers.botConfig, 'fetchByCampaignId')
    .returns(Promise.reject(mockError));

  // test
  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, mockError);
});
