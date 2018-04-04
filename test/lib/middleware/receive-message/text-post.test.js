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

chai.should();
chai.use(sinonChai);

// module to be tested
const textPost = require('../../../../lib/middleware/receive-message/text-post');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
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

  // test
  await middleware(t.context.req, t.context.res, next);
  next.should.have.been.called;
});
