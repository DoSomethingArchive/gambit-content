'use strict';

require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const underscore = require('underscore');

const helpers = require('../../../../lib/helpers');
const replies = require('../../../../lib/replies');
const stubs = require('../../../utils/stubs');

chai.should();
chai.use(sinonChai);

// module to be tested
const textPost = require('../../../../lib/middleware/campaignActivity/text-post');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  sandbox.stub(replies, 'askCaption')
    .returns(underscore.noop);
  sandbox.stub(replies, 'invalidCaption')
    .returns(underscore.noop);
  sandbox.stub(replies, 'menuCompleted')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('textPost returns next if not a textPost request', async (t) => {
  const next = sinon.stub();
  const middleware = textPost();
  sandbox.stub(helpers.request, 'isTextPost')
    .returns(false);

  await middleware(t.context.req, t.context.res, next);
  next.should.have.been.called;
  replies.askCaption.should.not.have.been.called;
  replies.invalidCaption.should.not.have.been.called;
  replies.menuCompleted.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('textPost returns askCaption when request has a keyword', async (t) => {
  const next = sinon.stub();
  const middleware = textPost();
  sandbox.stub(helpers.request, 'isTextPost')
    .returns(true);
  t.context.req.keyword = stubs.getKeyword();

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askCaption.should.have.been.calledWith(t.context.req, t.context.res);
  replies.invalidCaption.should.not.have.been.called;
  replies.menuCompleted.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('textPost returns invalidCaption when request.isValidReportbackText is false', async (t) => {
  const next = sinon.stub();
  const middleware = textPost();
  sandbox.stub(helpers.request, 'isTextPost')
    .returns(true);
  sandbox.stub(helpers.request, 'isValidReportbackText')
    .returns(true);
  sandbox.stub(helpers.campaignActivity, 'createTextPostFromReq')
    .returns(Promise.resolve({ id: stubs.getPostId() }));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askCaption.should.not.have.been.calledWith(t.context.req, t.context.res);
  replies.invalidCaption.should.not.have.been.called;
  helpers.campaignActivity.createTextPostFromReq.should.have.been.calledWith(t.context.req);
  replies.menuCompleted.should.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('textPost returns completedMenu upon createTextPostFromReq success', async (t) => {
  const next = sinon.stub();
  const middleware = textPost();
  sandbox.stub(helpers.request, 'isTextPost')
    .returns(true);
  sandbox.stub(helpers.request, 'isValidReportbackText')
    .returns(true);
  sandbox.stub(helpers.campaignActivity, 'createTextPostFromReq')
    .returns(Promise.resolve({ id: stubs.getPostId() }));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askCaption.should.not.have.been.calledWith(t.context.req, t.context.res);
  replies.invalidCaption.should.not.have.been.called;
  helpers.campaignActivity.createTextPostFromReq.should.have.been.calledWith(t.context.req);
  replies.menuCompleted.should.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('textPost returns sendErrorResponse upon createTextPostFromReq error', async (t) => {
  const next = sinon.stub();
  const middleware = textPost();
  sandbox.stub(helpers.request, 'isTextPost')
    .returns(true);
  sandbox.stub(helpers.request, 'isValidReportbackText')
    .returns(true);
  const error = new Error('epic fail');
  sandbox.stub(helpers.campaignActivity, 'createTextPostFromReq')
    .returns(Promise.reject(error));

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askCaption.should.not.have.been.calledWith(t.context.req, t.context.res);
  replies.invalidCaption.should.not.have.been.called;
  helpers.campaignActivity.createTextPostFromReq.should.have.been.calledWith(t.context.req);
  replies.menuCompleted.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, error);
});
