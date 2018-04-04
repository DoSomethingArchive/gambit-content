'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const logger = require('winston');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const httpMocks = require('node-mocks-http');

const stubs = require('../../utils/stubs');

const mockDraft = stubs.getDraft();

// Module to test
const signupHelper = require('../../../lib/helpers/signup');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  stubs.stubLogger(sandbox, logger);
  t.context.req = httpMocks.createRequest();
  t.context.req.userId = stubs.getUserId();
  t.context.req.campaignId = stubs.getCampaignId();
  t.context.req.campaignRunId = stubs.getCampaignRunId();
  t.context.req.platform = stubs.getPlatform();
  t.context.req.signup = {
    draft_reportback_submission: mockDraft,
  };
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

// getDefaultCreatePayloadFromReq
test('getDefaultCreatePayloadFromReq returns an object', (t) => {
  const result = signupHelper.getDefaultCreatePayloadFromReq(t.context.req);
  result.campaign_id.should.equal(t.context.req.campaignId);
  result.campaign_run_id.should.equal(t.context.req.campaignRunId);
  result.northstar_id.should.equal(t.context.req.userId);
  result.source.should.equal(t.context.req.platform);
});

// getCreatePhotoPostPayloadFromReq
test('getCreatePhotoPostPayloadFromReq returns an object', (t) => {
  sandbox.stub(signupHelper, 'getDefaultCreatePayloadFromReq')
    .returns({ userId: stubs.getUserId() });
  const result = signupHelper.getCreatePhotoPostPayloadFromReq(t.context.req);
  signupHelper.getDefaultCreatePayloadFromReq.should.have.been.called;
  result.photo.should.equal(mockDraft.photo);
  result.quantity.should.equal(mockDraft.quantity);
  result.caption.should.equal(mockDraft.caption);
  result.should.not.have.property('why_participated');
});
