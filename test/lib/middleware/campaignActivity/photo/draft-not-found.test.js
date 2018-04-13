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
const draftNotFound = require('../../../../../lib/middleware/campaignActivity/photo/draft-not-found');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  sandbox.stub(replies, 'startPhotoPost')
    .returns(underscore.noop);
  sandbox.stub(replies, 'startPhotoPostAutoReply')
    .returns(underscore.noop);
  sandbox.stub(replies, 'photoPostCompleted')
    .returns(underscore.noop);
  sandbox.stub(replies, 'photoPostCompletedAutoReply')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('draftNotFound returns next if request has draft submission', async (t) => {
  const next = sinon.stub();
  const middleware = draftNotFound();
  sandbox.stub(helpers.request, 'hasDraftSubmission')
    .returns(true);

  await middleware(t.context.req, t.context.res, next);
  next.should.have.been.called;
  replies.startPhotoPost.should.not.have.been.called;
  replies.startPhotoPostAutoReply.should.not.have.been.called;
  replies.photoPostCompleted.should.not.have.been.called;
  replies.photoPostCompletedAutoReply.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('draftNotFound returns start auto reply if draft undefined and not askQuestion', async (t) => {
  const next = sinon.stub();
  const middleware = draftNotFound();
  sandbox.stub(helpers.request, 'hasDraftSubmission')
    .returns(false);
  sandbox.stub(helpers.request, 'hasSubmittedPhotoPost')
    .returns(false);

  await middleware(t.context.req, t.context.res, next);
  next.should.not.have.been.called;
  replies.startPhotoPost.should.not.have.been.called;
  replies.startPhotoPostAutoReply.should.have.been.called;
  replies.photoPostCompleted.should.not.have.been.called;
  replies.photoPostCompletedAutoReply.should.not.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});
