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

chai.should();
chai.use(sinonChai);

// module to be tested
const draftCaption = require('../../../../../lib/middleware/campaignActivity/photo/draft-caption');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  sandbox.stub(replies, 'askCaption')
    .returns(underscore.noop);
  sandbox.stub(replies, 'invalidCaption')
    .returns(underscore.noop);
  sandbox.stub(replies, 'askWhyParticipated')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('draftCaption returns next if request has draft with caption', async (t) => {
  const next = sinon.stub();
  const middleware = draftCaption();
  sandbox.stub(helpers.request, 'hasDraftWithCaption')
    .returns(true);
  sandbox.stub(helpers.campaignActivity, 'saveDraftCaptionFromReq')
    .returns(Promise.resolve(true));

  await middleware(t.context.req, t.context.res, next);
  next.should.have.been.called;
  replies.askCaption.should.not.have.been.called;
  replies.invalidCaption.should.not.have.been.called;
  replies.askWhyParticipated.should.not.have.been.called;
  helpers.campaignActivity.saveDraftCaptionFromReq.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftCaption returns askCaption if request shouldAskNextQuestion', async (t) => {
  const next = sinon.stub();
  const middleware = draftCaption();
  sandbox.stub(helpers.request, 'hasDraftWithCaption')
    .returns(false);
  sandbox.stub(helpers.request, 'shouldAskNextQuestion')
    .returns(true);
  sandbox.stub(helpers.campaignActivity, 'saveDraftCaptionFromReq')
    .returns(Promise.resolve(true));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askCaption.should.have.been.called;
  replies.invalidCaption.should.not.have.been.called;
  replies.askWhyParticipated.should.not.have.been.called;
  helpers.campaignActivity.saveDraftCaptionFromReq.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftCaption returns invalidCaption if request not isValidReportbackText', async (t) => {
  const next = sinon.stub();
  const middleware = draftCaption();
  sandbox.stub(helpers.request, 'hasDraftWithCaption')
    .returns(false);
  sandbox.stub(helpers.request, 'shouldAskNextQuestion')
    .returns(false);
  sandbox.stub(helpers.request, 'isValidReportbackText')
    .returns(false);
  sandbox.stub(helpers.campaignActivity, 'saveDraftCaptionFromReq')
    .returns(Promise.resolve(true));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askCaption.should.not.have.been.called;
  replies.invalidCaption.should.have.been.called;
  replies.askWhyParticipated.should.not.have.been.called;
  helpers.campaignActivity.saveDraftCaptionFromReq.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftCaption returns askWhyParticipated if user has not submitted photo post', async (t) => {
  const next = sinon.stub();
  const middleware = draftCaption();
  sandbox.stub(helpers.request, 'hasDraftWithCaption')
    .returns(false);
  sandbox.stub(helpers.request, 'shouldAskNextQuestion')
    .returns(false);
  sandbox.stub(helpers.request, 'isValidReportbackText')
    .returns(true);
  sandbox.stub(helpers.campaignActivity, 'saveDraftCaptionFromReq')
    .returns(Promise.resolve(true));
  sandbox.stub(helpers.request, 'hasSubmittedPhotoPost')
    .returns(false);

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askCaption.should.not.have.been.called;
  replies.invalidCaption.should.not.have.been.called;
  replies.askWhyParticipated.should.have.been.called;
  helpers.campaignActivity.saveDraftCaptionFromReq.should.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftCaption returns next if user has submitted photo post', async (t) => {
  const next = sinon.stub();
  const middleware = draftCaption();
  sandbox.stub(helpers.request, 'hasDraftWithCaption')
    .returns(false);
  sandbox.stub(helpers.request, 'shouldAskNextQuestion')
    .returns(false);
  sandbox.stub(helpers.request, 'isValidReportbackText')
    .returns(true);
  sandbox.stub(helpers.campaignActivity, 'saveDraftCaptionFromReq')
    .returns(Promise.resolve(true));
  sandbox.stub(helpers.request, 'hasSubmittedPhotoPost')
    .returns(true);

  await middleware(t.context.req, t.context.res, next);
  next.should.have.been.called;
  replies.askCaption.should.not.have.been.called;
  replies.invalidCaption.should.not.have.been.called;
  replies.askWhyParticipated.should.not.have.been.called;
  helpers.campaignActivity.saveDraftCaptionFromReq.should.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftCaption returns sendErrorResponse if saveDraftCaptionFromReq fails', async (t) => {
  const next = sinon.stub();
  const middleware = draftCaption();
  sandbox.stub(helpers.request, 'hasDraftWithCaption')
    .returns(false);
  sandbox.stub(helpers.request, 'shouldAskNextQuestion')
    .returns(false);
  sandbox.stub(helpers.request, 'isValidReportbackText')
    .returns(true);
  sandbox.stub(helpers.campaignActivity, 'saveDraftCaptionFromReq')
    .returns(Promise.reject(new Error('o noes')));
  sandbox.stub(helpers.request, 'hasSubmittedPhotoPost')
    .returns(true);

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askCaption.should.not.have.been.called;
  replies.invalidCaption.should.not.have.been.called;
  replies.askWhyParticipated.should.not.have.been.called;
  helpers.campaignActivity.saveDraftCaptionFromReq.should.have.been.called;
  helpers.sendErrorResponse.should.have.been.called;
});
