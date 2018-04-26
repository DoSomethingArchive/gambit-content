'use strict';

require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const underscore = require('underscore');

const helpers = require('../../../../../lib/helpers');
const replies = require('../../../../../lib/replies');
const signupFactory = require('../../../../utils/factories/signup');

chai.should();
chai.use(sinonChai);

// module to be tested
const draftNotFound = require('../../../../../lib/middleware/campaignActivity/photo/draft-not-found');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  sandbox.stub(replies, 'startPhotoPost')
    .returns(underscore.noop);
  sandbox.stub(replies, 'startPhotoPostAutoReply')
    .returns(underscore.noop);
  sandbox.stub(replies, 'completedPhotoPost')
    .returns(underscore.noop);
  sandbox.stub(replies, 'completedPhotoPostAutoReply')
    .returns(underscore.noop);
  sandbox.stub(replies, 'askQuantity')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('draftNotFound returns sendErrorResponse if hasDraftSubmission throws', async (t) => {
  const next = sinon.stub();
  const middleware = draftNotFound();
  sandbox.stub(helpers.request, 'hasDraftSubmission')
    .throws();

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.startPhotoPost.should.not.have.been.called;
  replies.startPhotoPostAutoReply.should.not.have.been.called;
  replies.completedPhotoPost.should.not.have.been.called;
  replies.completedPhotoPostAutoReply.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.called;
});

test('draftNotFound returns next if request has draft', async (t) => {
  const next = sinon.stub();
  const middleware = draftNotFound();
  sandbox.stub(helpers.request, 'hasDraftSubmission')
    .returns(true);

  await middleware(t.context.req, t.context.res, next);
  next.should.have.been.called;
  replies.startPhotoPost.should.not.have.been.called;
  replies.startPhotoPostAutoReply.should.not.have.been.called;
  replies.completedPhotoPost.should.not.have.been.called;
  replies.completedPhotoPostAutoReply.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftNotFound returns askQuantity if request.isStartCommand', async (t) => {
  const next = sinon.stub();
  const middleware = draftNotFound();
  t.context.req.signup = signupFactory.getValidSignup();
  sandbox.stub(helpers.request, 'hasDraftSubmission')
    .returns(false);
  sandbox.stub(helpers.request, 'isStartCommand')
    .returns(true);
  sandbox.stub(t.context.req.signup, 'createDraftReportbackSubmission')
    .returns(Promise.resolve(true));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  t.context.req.signup.createDraftReportbackSubmission.should.have.been.called;
  replies.askQuantity.should.have.been.called;
  replies.startPhotoPost.should.not.have.been.called;
  replies.startPhotoPostAutoReply.should.not.have.been.called;
  replies.completedPhotoPost.should.not.have.been.called;
  replies.completedPhotoPostAutoReply.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftNotFound returns sendErrroResponse if createDraftReportbackSubmission fails', async (t) => {
  const next = sinon.stub();
  const middleware = draftNotFound();
  t.context.req.signup = signupFactory.getValidSignup();
  sandbox.stub(helpers.request, 'hasDraftSubmission')
    .returns(false);
  sandbox.stub(helpers.request, 'isStartCommand')
    .returns(true);
  sandbox.stub(t.context.req.signup, 'createDraftReportbackSubmission')
    .returns(Promise.reject(new Error()));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  t.context.req.signup.createDraftReportbackSubmission.should.have.been.called;
  replies.askQuantity.should.not.have.been.called;
  replies.startPhotoPost.should.not.have.been.called;
  replies.startPhotoPostAutoReply.should.not.have.been.called;
  replies.completedPhotoPost.should.not.have.been.called;
  replies.completedPhotoPostAutoReply.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.called;
});

test('draftNotFound sends startPhotoPostAutoReply when not hasSubmittedPhotoPost and not askNextQuestion', async (t) => {
  const next = sinon.stub();
  const middleware = draftNotFound();
  sandbox.stub(helpers.request, 'hasDraftSubmission')
    .returns(false);
  sandbox.stub(helpers.request, 'isStartCommand')
    .returns(false);
  sandbox.stub(helpers.request, 'hasSubmittedPhotoPost')
    .returns(false);

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.startPhotoPost.should.not.have.been.called;
  replies.startPhotoPostAutoReply.should.have.been.called;
  replies.completedPhotoPost.should.not.have.been.called;
  replies.completedPhotoPostAutoReply.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftNotFound sends startPhotoPost when not hasSubmittedPhotoPost and askNextQuestion', async (t) => {
  const next = sinon.stub();
  const middleware = draftNotFound();
  sandbox.stub(helpers.request, 'hasDraftSubmission')
    .returns(false);
  sandbox.stub(helpers.request, 'isStartCommand')
    .returns(false);
  sandbox.stub(helpers.request, 'hasSubmittedPhotoPost')
    .returns(false);
  t.context.req.askNextQuestion = true;

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.startPhotoPost.should.have.been.called;
  replies.startPhotoPostAutoReply.should.not.have.been.called;
  replies.completedPhotoPost.should.not.have.been.called;
  replies.completedPhotoPostAutoReply.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftNotFound sends completedPhotoPost when hasSubmittedPhotoPost and askNextQuestion', async (t) => {
  const next = sinon.stub();
  const middleware = draftNotFound();
  sandbox.stub(helpers.request, 'hasDraftSubmission')
    .returns(false);
  sandbox.stub(helpers.request, 'isStartCommand')
    .returns(false);
  sandbox.stub(helpers.request, 'hasSubmittedPhotoPost')
    .returns(true);
  t.context.req.askNextQuestion = true;

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.startPhotoPost.should.not.have.been.called;
  replies.startPhotoPostAutoReply.should.not.have.been.called;
  replies.completedPhotoPost.should.have.been.called;
  replies.completedPhotoPostAutoReply.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftNotFound sends completedPhotoPostAutoReply when hasSubmittedPhotoPost and not askNextQuestion', async (t) => {
  const next = sinon.stub();
  const middleware = draftNotFound();
  sandbox.stub(helpers.request, 'hasDraftSubmission')
    .returns(false);
  sandbox.stub(helpers.request, 'isStartCommand')
    .returns(false);
  sandbox.stub(helpers.request, 'hasSubmittedPhotoPost')
    .returns(true);

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.startPhotoPost.should.not.have.been.called;
  replies.startPhotoPostAutoReply.should.not.have.been.called;
  replies.completedPhotoPost.should.not.have.been.called;
  replies.completedPhotoPostAutoReply.should.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});
