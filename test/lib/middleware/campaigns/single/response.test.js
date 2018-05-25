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

const campaign = stubs.getPhoenixCampaign();
const firstMockTopic = {
  postType: 'text',
  templates: {
    askSignup: {
      rendered: stubs.getRandomMessageText(),
    },
  },
};
const secondMockTopic = {
  postType: 'external',
  templates: {
    askSignup: {
      rendered: stubs.getRandomMessageText(),
    },
  },
};
const mockTopics = [firstMockTopic, secondMockTopic];

chai.should();
chai.use(sinonChai);

// module to be tested
const sendResponse = require('../../../../../lib/middleware/campaigns/single/response');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.req.campaign = campaign;
  t.context.res = httpMocks.createResponse();
  sandbox.spy(t.context.res, 'send');
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('sendResponse sends botConfig object with null properties when req.topics undefined', (t) => {
  const middleware = sendResponse();
  t.context.req.topics = [];
  middleware(t.context.req, t.context.res);

  t.falsy(t.context.req.campaign.botConfig.postType);
  t.falsy(t.context.req.campaign.botConfig.templates);
  t.context.res.send.should.have.been.called;
});

test('sendResponse injects a topics array if req.topics exists', (t) => {
  t.context.req.topics = mockTopics;
  const middleware = sendResponse();

  middleware(t.context.req, t.context.res);
  t.context.req.campaign.topics.should.deep.equal(mockTopics);
  t.context.req.campaign.botConfig.postType.should.equal(firstMockTopic.postType);
  t.context.req.campaign.botConfig.templates.should.deep.equal(firstMockTopic.templates);
  t.context.res.send.should.have.been.called;
});

test('sendResponse calls sendErrorResponse if an error is caught', (t) => {
  const middleware = sendResponse();
  middleware(t.context.req, t.context.res);
  helpers.sendErrorResponse.should.have.been.called;
});
