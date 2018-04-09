'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const logger = require('winston');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const httpMocks = require('node-mocks-http');

const rogue = require('../../../lib/rogue');
const stubs = require('../../utils/stubs');

const mockDraft = stubs.getDraft();
const mockDefaultCreatePayload = { id: stubs.getUserId() };
const mockPost = stubs.getPost();

// Module to test
const activityHelper = require('../../../lib/helpers/campaignActivity');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  stubs.stubLogger(sandbox, logger);
  sandbox.stub(rogue, 'createPost')
    .returns(Promise.resolve(mockPost));
  t.context.req = httpMocks.createRequest();
  t.context.req.userId = stubs.getUserId();
  t.context.req.incoming_message = stubs.getRandomString();
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

// createPhotoPostFromReq
test('createTextPostFromReq calls createPost with getCreateTextPostPayloadFromReq', async (t) => {
  sandbox.stub(activityHelper, 'getDefaultCreatePayloadFromReq')
    .returns(mockDefaultCreatePayload);

  const result = await activityHelper.createTextPostFromReq(t.context.req);
  activityHelper.getDefaultCreatePayloadFromReq.should.have.been.called;
  rogue.createPost.should.have.been.calledWith(mockDefaultCreatePayload);
  result.should.equal(mockPost);
});

// getDefaultCreatePayloadFromReq
test('getDefaultCreatePayloadFromReq returns an object', (t) => {
  const result = activityHelper.getDefaultCreatePayloadFromReq(t.context.req);
  result.campaign_id.should.equal(t.context.req.campaignId);
  result.campaign_run_id.should.equal(t.context.req.campaignRunId);
  result.northstar_id.should.equal(t.context.req.userId);
  result.source.should.equal(t.context.req.platform);
});

// getCreatePhotoPostPayloadFromReq
test('getCreatePhotoPostPayloadFromReq returns an object', (t) => {
  sandbox.stub(activityHelper, 'getDefaultCreatePayloadFromReq')
    .returns(mockDefaultCreatePayload);
  const result = activityHelper.getCreatePhotoPostPayloadFromReq(t.context.req);
  result.type.should.equal('photo');
  activityHelper.getDefaultCreatePayloadFromReq.should.have.been.called;
  result.photoUrl.should.equal(mockDraft.photo);
  result.quantity.should.equal(mockDraft.quantity);
  result.caption.should.equal(mockDraft.caption);
  result.should.not.have.property('why_participated');
});

// getCreateTextPostPayloadFromReq
test('getCreateTextPostPayloadFromReq returns an object', (t) => {
  sandbox.stub(activityHelper, 'getDefaultCreatePayloadFromReq')
    .returns(mockDefaultCreatePayload);
  const result = activityHelper.getCreateTextPostPayloadFromReq(t.context.req);
  result.type.should.equal('text');
  result.text.should.equal(t.context.req.incoming_message);
});
