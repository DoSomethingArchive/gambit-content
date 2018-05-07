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
const stubs = require('../../../../utils/stubs');

chai.should();
chai.use(sinonChai);

// module to be tested
const draftPhoto = require('../../../../../lib/middleware/campaignActivity/photo/draft-photo');

const sandbox = sinon.sandbox.create();

const photoUrl = stubs.getPhotoUrl();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  sandbox.stub(replies, 'askPhoto')
    .returns(underscore.noop);
  sandbox.stub(replies, 'noPhotoSent')
    .returns(underscore.noop);
  sandbox.stub(replies, 'askCaption')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('draftPhoto returns next if request has draft with photo', async (t) => {
  const next = sinon.stub();
  const middleware = draftPhoto();
  sandbox.stub(helpers.request, 'hasDraftWithPhoto')
    .returns(true);
  sandbox.stub(helpers.campaignActivity, 'saveDraftPhotoFromReq')
    .returns(Promise.resolve(true));

  await middleware(t.context.req, t.context.res, next);
  next.should.have.been.called;
  replies.askPhoto.should.not.have.been.called;
  replies.noPhotoSent.should.not.have.been.called;
  replies.askCaption.should.not.have.been.called;
  helpers.campaignActivity.saveDraftPhotoFromReq.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftPhoto returns askPhoto if request shouldAskNextQuestion', async (t) => {
  const next = sinon.stub();
  const middleware = draftPhoto();
  sandbox.stub(helpers.request, 'hasDraftWithPhoto')
    .returns(false);
  sandbox.stub(helpers.request, 'shouldAskNextQuestion')
    .returns(true);
  sandbox.stub(helpers.campaignActivity, 'saveDraftPhotoFromReq')
    .returns(Promise.resolve(true));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askPhoto.should.have.been.called;
  replies.noPhotoSent.should.not.have.been.called;
  replies.askCaption.should.not.have.been.called;
  helpers.campaignActivity.saveDraftPhotoFromReq.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftPhoto returns noPhotoSent if request does not have photoUrl', async (t) => {
  const next = sinon.stub();
  const middleware = draftPhoto();
  sandbox.stub(helpers.request, 'hasDraftWithPhoto')
    .returns(false);
  sandbox.stub(helpers.request, 'shouldAskNextQuestion')
    .returns(false);
  sandbox.stub(helpers.request, 'getMessagePhotoUrl')
    .returns(null);
  sandbox.stub(helpers.campaignActivity, 'saveDraftPhotoFromReq')
    .returns(Promise.resolve(true));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askPhoto.should.not.have.been.called;
  replies.noPhotoSent.should.have.been.called;
  replies.askCaption.should.not.have.been.called;
  helpers.campaignActivity.saveDraftPhotoFromReq.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftPhoto returns askWhyParticipated if user has not submitted photo post', async (t) => {
  const next = sinon.stub();
  const middleware = draftPhoto();
  sandbox.stub(helpers.request, 'hasDraftWithPhoto')
    .returns(false);
  sandbox.stub(helpers.request, 'shouldAskNextQuestion')
    .returns(false);
  sandbox.stub(helpers.request, 'getMessagePhotoUrl')
    .returns(photoUrl);
  sandbox.stub(helpers.campaignActivity, 'saveDraftPhotoFromReq')
    .returns(Promise.resolve(true));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askPhoto.should.not.have.been.called;
  replies.noPhotoSent.should.not.have.been.called;
  replies.askCaption.should.have.been.called;
  helpers.campaignActivity.saveDraftPhotoFromReq.should.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftPhoto returns askCaption on saveDraftPhotoFromReq success', async (t) => {
  const next = sinon.stub();
  const middleware = draftPhoto();
  sandbox.stub(helpers.request, 'hasDraftWithPhoto')
    .returns(false);
  sandbox.stub(helpers.request, 'shouldAskNextQuestion')
    .returns(false);
  sandbox.stub(helpers.request, 'getMessagePhotoUrl')
    .returns(photoUrl);
  sandbox.stub(helpers.campaignActivity, 'saveDraftPhotoFromReq')
    .returns(Promise.resolve(true));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askPhoto.should.not.have.been.called;
  replies.noPhotoSent.should.not.have.been.called;
  replies.askCaption.should.have.been.called;
  helpers.campaignActivity.saveDraftPhotoFromReq.should.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftPhoto returns sendErrorResponse if saveDraftPhotoFromReq fails', async (t) => {
  const next = sinon.stub();
  const middleware = draftPhoto();
  sandbox.stub(helpers.request, 'hasDraftWithPhoto')
    .returns(false);
  sandbox.stub(helpers.request, 'shouldAskNextQuestion')
    .returns(false);
  sandbox.stub(helpers.request, 'getMessagePhotoUrl')
    .returns(photoUrl);
  sandbox.stub(helpers.campaignActivity, 'saveDraftPhotoFromReq')
    .returns(Promise.reject(new Error('o noes')));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askPhoto.should.not.have.been.called;
  replies.noPhotoSent.should.not.have.been.called;
  replies.askCaption.should.not.have.been.called;
  helpers.campaignActivity.saveDraftPhotoFromReq.should.have.been.called;
  helpers.sendErrorResponse.should.have.been.called;
});
