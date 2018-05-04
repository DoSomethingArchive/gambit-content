'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const logger = require('winston');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const httpMocks = require('node-mocks-http');

const helpers = require('../../../lib/helpers');
const rogue = require('../../../lib/rogue');
const stubs = require('../../utils/stubs');
const signupFactory = require('../../utils/factories/signup');

const mockDefaultCreatePayload = { id: stubs.getUserId() };
const mockMessageText = stubs.getRandomString();
const mockPost = stubs.getPost();
const mockSignup = signupFactory.getValidSignupWthDraft();
const mockDraft = mockSignup.draft_reportback_submission;

// Module to test
const activityHelper = require('../../../lib/helpers/campaignActivity');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  stubs.stubLogger(sandbox, logger);
  sandbox.stub(mockDraft, 'save')
    .returns(Promise.resolve({}));
  sandbox.stub(rogue, 'createPost')
    .returns(Promise.resolve(mockPost));
  t.context.req = httpMocks.createRequest();
  t.context.req.userId = stubs.getUserId();
  t.context.req.incoming_message = mockMessageText;
  t.context.req.campaignId = stubs.getCampaignId();
  t.context.req.campaignRunId = stubs.getCampaignRunId();
  t.context.req.platform = stubs.getPlatform();
  t.context.req.signup = mockSignup;
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

// createPhotoPostFromReq
test('createDraftFromReq calls req.signup.createDraftReportbackSubmission', async (t) => {
  sandbox.stub(activityHelper, 'getDefaultCreatePayloadFromReq')
    .returns(mockDefaultCreatePayload);

  const result = await activityHelper.createTextPostFromReq(t.context.req);
  activityHelper.getDefaultCreatePayloadFromReq.should.have.been.called;
  rogue.createPost.should.have.been.calledWith(mockDefaultCreatePayload);
  result.should.equal(mockPost);
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
  result.why_participated.should.equal(mockDraft.why_participated);
});

// getReportbackTextFromReq
test('getReportbackTextFromReq returns a string', (t) => {
  const mockResult = 'Winter is coming';
  sandbox.stub(helpers.request, 'getMessageText')
    .returns(mockMessageText);
  sandbox.stub(helpers.util, 'trimText')
    .returns(mockResult);

  const result = activityHelper.getReportbackTextFromReq(t.context.req);
  result.should.equal(mockResult);
  helpers.request.getMessageText.should.have.been.calledWith(t.context.req);
  helpers.util.trimText.should.have.been.calledWith(mockMessageText);
});

// getCreateTextPostPayloadFromReq
test('getCreateTextPostPayloadFromReq returns an object', (t) => {
  sandbox.stub(activityHelper, 'getDefaultCreatePayloadFromReq')
    .returns(mockDefaultCreatePayload);
  sandbox.stub(activityHelper, 'getReportbackTextFromReq')
    .returns(mockMessageText);

  const result = activityHelper.getCreateTextPostPayloadFromReq(t.context.req);
  activityHelper.getReportbackTextFromReq.should.have.been.called;
  result.text.should.equal(mockMessageText);
});

// saveDraftCaptionFromReq
test('saveDraftCaptionFromReq sets req.draftSubmission.caption and calls save', async (t) => {
  sandbox.stub(activityHelper, 'getReportbackTextFromReq')
    .returns(mockMessageText);
  t.context.req.draftSubmission = mockDraft;

  await activityHelper.saveDraftCaptionFromReq(t.context.req);
  t.context.req.draftSubmission.caption.should.equal(mockMessageText);
  mockDraft.save.should.have.been.called;
});

// saveDraftPhotoFromReq
test('saveDraftPhotoFromReq sets req.draftSubmission.why_participated and calls save', async (t) => {
  const photoUrl = mockDraft.photo;
  sandbox.stub(helpers.request, 'getMessagePhotoUrl')
    .returns(photoUrl);
  t.context.req.draftSubmission = mockDraft;

  await activityHelper.saveDraftPhotoFromReq(t.context.req);
  t.context.req.draftSubmission.photo.should.equal(photoUrl);
  mockDraft.save.should.have.been.called;
});

// saveDraftQuantityFromReq
test('saveDraftQuantityFromReq sets req.draftSubmission.quantity and calls save', async (t) => {
  const quantity = '240';
  sandbox.stub(helpers.request, 'getMessageText')
    .returns(quantity);
  t.context.req.draftSubmission = mockDraft;

  await activityHelper.saveDraftQuantityFromReq(t.context.req);
  t.context.req.draftSubmission.quantity.should.equal(Number(quantity));
  mockDraft.save.should.have.been.called;
});

// saveDraftWhyParticipatedFromReq
test('saveDraftWhyParticipatedFromReq sets req.draftSubmission.why_participated and calls save', async (t) => {
  sandbox.stub(activityHelper, 'getReportbackTextFromReq')
    .returns(mockMessageText);
  t.context.req.draftSubmission = mockDraft;

  await activityHelper.saveDraftWhyParticipatedFromReq(t.context.req);
  t.context.req.draftSubmission.why_participated.should.equal(mockMessageText);
  mockDraft.save.should.have.been.called;
});
