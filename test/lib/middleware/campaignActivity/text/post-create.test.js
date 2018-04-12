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
const textPost = require('../../../../../lib/middleware/campaignActivity/text/post-create');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  sandbox.stub(replies, 'askText')
    .returns(underscore.noop);
  sandbox.stub(replies, 'invalidText')
    .returns(underscore.noop);
  sandbox.stub(replies, 'textPostCompleted')
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
  replies.askText.should.not.have.been.called;
  replies.invalidText.should.not.have.been.called;
  replies.textPostCompleted.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('textPost returns askText when request has a keyword', async (t) => {
  const next = sinon.stub();
  const middleware = textPost();
  sandbox.stub(helpers.request, 'isTextPost')
    .returns(true);
  t.context.req.keyword = stubs.getKeyword();

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.askText.should.have.been.calledWith(t.context.req, t.context.res);
  replies.invalidText.should.not.have.been.called;
  replies.textPostCompleted.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('textPost returns invalidText when request.isValidReportbackText is false', async (t) => {
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
  replies.askText.should.not.have.been.calledWith(t.context.req, t.context.res);
  replies.invalidText.should.not.have.been.called;
  helpers.campaignActivity.createTextPostFromReq.should.have.been.calledWith(t.context.req);
  replies.textPostCompleted.should.have.been.called;
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
  replies.askText.should.not.have.been.calledWith(t.context.req, t.context.res);
  replies.invalidText.should.not.have.been.called;
  helpers.campaignActivity.createTextPostFromReq.should.have.been.calledWith(t.context.req);
  replies.textPostCompleted.should.have.been.called;
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
  replies.askText.should.not.have.been.calledWith(t.context.req, t.context.res);
  replies.invalidText.should.not.have.been.called;
  helpers.campaignActivity.createTextPostFromReq.should.have.been.calledWith(t.context.req);
  replies.textPostCompleted.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, error);
});
