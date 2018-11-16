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
const campaignFactory = require('../../../../utils/factories/campaign');
const campaignConfigFactory = require('../../../../utils/factories/contentful/campaign');

const campaign = campaignFactory.getValidCampaign();
const campaignConfig = campaignConfigFactory.getValidCampaign();

chai.should();
chai.use(sinonChai);

// module to be tested
const getCampaign = require('../../../../../lib/middleware/campaigns/single/campaign-get');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  sandbox.stub(helpers.response, 'sendData')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.req.campaign = stubs.getPhoenixCampaign();
  t.context.res = httpMocks.createResponse();
  sandbox.stub(t.context.res, 'send')
    .returns(underscore.noop);
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('getCampaign should return getById result with config property set to getCampaignConfigByCampaignId result', async (t) => {
  const next = sinon.stub();
  const middleware = getCampaign();
  sandbox.stub(helpers.campaign, 'getById')
    .returns(Promise.resolve(campaign));
  sandbox.stub(helpers.campaign, 'getCampaignConfigByCampaignId')
    .returns(Promise.resolve(campaignConfig));
  const data = Object.assign(campaign, { config: campaignConfig });

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.response.sendData.should.have.been.calledWith(data);
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('getCampaign should sendErrorResponse if getById fails', async (t) => {
  const next = sinon.stub();
  const middleware = getCampaign();
  const mockError = { message: 'Epic fail' };
  sandbox.stub(helpers.campaign, 'getById')
    .returns(Promise.reject(mockError));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, mockError);
});
