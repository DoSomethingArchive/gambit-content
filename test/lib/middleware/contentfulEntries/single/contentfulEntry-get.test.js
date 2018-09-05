'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const underscore = require('underscore');

const stubs = require('../../../../utils/stubs');
const helpers = require('../../../../../lib/helpers');

const askYesNoFactory = require('../../../../utils/factories/contentful/askYesNo');

const askYesNoEntry = askYesNoFactory.getValidAskYesNo();

chai.should();
chai.use(sinonChai);

// module to be tested
const getContentfulEntry = require('../../../../../lib/middleware/contentfulEntries/single/contentfulEntry-get');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.req.params = {
    contentfulId: stubs.getContentfulId(),
  };
  t.context.res = httpMocks.createResponse();
  sandbox.spy(t.context.res, 'send');
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('getContentfulEntry should send data with fetchById result', async (t) => {
  const next = sinon.stub();
  const middleware = getContentfulEntry();
  sandbox.stub(helpers.contentfulEntry, 'fetchById')
    .returns(Promise.resolve(askYesNoEntry));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.contentfulEntry.fetchById
    .should.have.been.calledWith(t.context.req.params.contentfulId);
  t.context.res.send.should.have.been.calledWith({ data: askYesNoEntry });
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('getContentfulEntry should sendErrorResponse if fetchById fails', async (t) => {
  const next = sinon.stub();
  const middleware = getContentfulEntry();
  const mockError = { message: 'Epic fail' };
  sandbox.stub(helpers.contentfulEntry, 'fetchById')
    .returns(Promise.reject(mockError));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.contentfulEntry.fetchById
    .should.have.been.calledWith(t.context.req.params.contentfulId);
  t.context.res.send.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, mockError);
});
