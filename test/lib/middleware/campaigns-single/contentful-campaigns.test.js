'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const underscore = require('underscore');

const contentful = require('../../../../lib/contentful');
const stubs = require('../../../utils/stubs');
const helpers = require('../../../../lib/helpers');

chai.should();
chai.use(sinonChai);

// module to be tested
const getContentfulCampaigns = require('../../../../lib/middleware/campaigns-single/contentful-campaigns');

const sandbox = sinon.sandbox.create();

const defaultCampaignStub = stubs.contentful.getEntries('default-campaign').items[0];
const campaignWithOverridesStub = stubs.contentful.getEntries('campaign-with-overrides').items[0];

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.req.campaignId = stubs.getCampaignId();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('getContentfulCampaigns should inject a contentfulCampaigns property', async (t) => {
  const next = sinon.stub();
  const middleware = getContentfulCampaigns();
  const mockResponse = {
    default: defaultCampaignStub,
    override: campaignWithOverridesStub,
  };
  sandbox.stub(contentful, 'fetchDefaultAndOverrideCampaignsForCampaignId')
    .returns(Promise.resolve(mockResponse));

  // test
  await middleware(t.context.req, t.context.res, next);
  t.context.req.contentfulCampaigns.should.deep.equal(mockResponse);
  next.should.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('getContentfulCampaigns should sendErrorResponse if fetchDefaultAndOverrideCampaignsForCampaignId fails', async (t) => {
  const next = sinon.stub();
  const middleware = getContentfulCampaigns();
  const mockError = { message: 'Epic fail' };
  sandbox.stub(contentful, 'fetchDefaultAndOverrideCampaignsForCampaignId')
    .returns(Promise.reject(mockError));

  // test
  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, mockError);
});
