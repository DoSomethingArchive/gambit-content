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
const draftQuantity = require('../../../../../lib/middleware/campaignActivity/photo/draft-quantity');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  sandbox.stub(replies, 'askQuantity')
    .returns(underscore.noop);
  sandbox.stub(replies, 'invalidQuantity')
    .returns(underscore.noop);
  sandbox.stub(replies, 'askPhoto')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('draftQuantity returns next if request has draft with quantity', async (t) => {
  const next = sinon.stub();
  const middleware = draftQuantity();
  sandbox.stub(helpers.request, 'hasDraftWithQuantity')
    .returns(true);
  sandbox.stub(helpers.campaignActivity, 'saveDraftQuantityFromReq')
    .returns(Promise.resolve(true));

  await middleware(t.context.req, t.context.res, next);
  next.should.have.been.called;
  replies.askQuantity.should.not.have.been.called;
  replies.invalidQuantity.should.not.have.been.called;
  replies.askPhoto.should.not.have.been.called;
  helpers.campaignActivity.saveDraftQuantityFromReq.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftQuantity returns askQuantity if request shouldAskNextQuestion', async (t) => {
  const next = sinon.stub();
  const middleware = draftQuantity();
  sandbox.stub(helpers.request, 'hasDraftWithQuantity')
    .returns(false);
  sandbox.stub(helpers.request, 'shouldAskNextQuestion')
    .returns(true);
  sandbox.stub(helpers.campaignActivity, 'saveDraftQuantityFromReq')
    .returns(Promise.resolve(true));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askQuantity.should.have.been.called;
  replies.invalidQuantity.should.not.have.been.called;
  replies.askPhoto.should.not.have.been.called;
  helpers.campaignActivity.saveDraftQuantityFromReq.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftQuantity returns invalidQuantity if request does not have valid quantity', async (t) => {
  const next = sinon.stub();
  const middleware = draftQuantity();
  sandbox.stub(helpers.request, 'hasDraftWithQuantity')
    .returns(false);
  sandbox.stub(helpers.request, 'shouldAskNextQuestion')
    .returns(false);
  sandbox.stub(helpers.request, 'isValidReportbackQuantity')
    .returns(false);
  sandbox.stub(helpers.campaignActivity, 'saveDraftQuantityFromReq')
    .returns(Promise.resolve(true));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askQuantity.should.not.have.been.called;
  replies.invalidQuantity.should.have.been.called;
  replies.askPhoto.should.not.have.been.called;
  helpers.campaignActivity.saveDraftQuantityFromReq.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftQuantity returns askPhoto on saveDraftQuantityFromReq success', async (t) => {
  const next = sinon.stub();
  const middleware = draftQuantity();
  sandbox.stub(helpers.request, 'hasDraftWithQuantity')
    .returns(false);
  sandbox.stub(helpers.request, 'shouldAskNextQuestion')
    .returns(false);
  sandbox.stub(helpers.request, 'isValidReportbackQuantity')
    .returns(true);
  sandbox.stub(helpers.campaignActivity, 'saveDraftQuantityFromReq')
    .returns(Promise.resolve(true));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askQuantity.should.not.have.been.called;
  replies.invalidQuantity.should.not.have.been.called;
  replies.askPhoto.should.have.been.called;
  helpers.campaignActivity.saveDraftQuantityFromReq.should.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftQuantity returns sendErrorResponse if saveDraftQuantityFromReq fails', async (t) => {
  const next = sinon.stub();
  const middleware = draftQuantity();
  sandbox.stub(helpers.request, 'hasDraftWithQuantity')
    .returns(false);
  sandbox.stub(helpers.request, 'shouldAskNextQuestion')
    .returns(false);
  sandbox.stub(helpers.request, 'isValidReportbackQuantity')
    .returns(true);
  sandbox.stub(helpers.campaignActivity, 'saveDraftQuantityFromReq')
    .returns(Promise.reject(new Error('o noes')));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askQuantity.should.not.have.been.called;
  replies.invalidQuantity.should.not.have.been.called;
  replies.askPhoto.should.not.have.been.called;
  helpers.campaignActivity.saveDraftQuantityFromReq.should.have.been.called;
  helpers.sendErrorResponse.should.have.been.called;
});
