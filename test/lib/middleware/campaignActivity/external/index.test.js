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
const externalPost = require('../../../../../lib/middleware/campaignActivity/external');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  sandbox.stub(replies, 'startExternalPost')
    .returns(underscore.noop);
  sandbox.stub(replies, 'startExternalPostAutoReply')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('externalPost returns next if not an externalPost request', async (t) => {
  const next = sinon.stub();
  const middleware = externalPost();
  sandbox.stub(helpers.request, 'isExternalPost')
    .returns(false);
  sandbox.stub(helpers.request, 'isKeyword')
    .returns(true);

  await middleware(t.context.req, t.context.res, next);
  next.should.have.been.called;
  helpers.request.isKeyword.should.not.have.been.called;
  replies.startExternalPost.should.not.have.been.called;
  replies.startExternalPostAutoReply.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('externalPost returns startExternalPost for externalPost keyword request', async (t) => {
  const next = sinon.stub();
  const middleware = externalPost();
  sandbox.stub(helpers.request, 'isExternalPost')
    .returns(true);
  sandbox.stub(helpers.request, 'isKeyword')
    .returns(true);

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.startExternalPost.should.have.been.calledWith(t.context.req, t.context.res);
  replies.startExternalPostAutoReply.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('externalPost returns startExternalPostAutoReply for externalPost non-keyword request', async (t) => {
  const next = sinon.stub();
  const middleware = externalPost();
  sandbox.stub(helpers.request, 'isExternalPost')
    .returns(true);

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.startExternalPost.should.not.have.been.called;
  replies.startExternalPostAutoReply.should.have.been.calledWith(t.context.req, t.context.res);
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('externalPost returns sendErrorResponse if error', async (t) => {
  const next = sinon.stub();
  const middleware = externalPost();
  const error = new Error('o noes');
  sandbox.stub(helpers.request, 'isExternalPost')
    .throws(error);

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.startExternalPost.should.not.have.been.called;
  replies.startExternalPostAutoReply.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, error);
});
