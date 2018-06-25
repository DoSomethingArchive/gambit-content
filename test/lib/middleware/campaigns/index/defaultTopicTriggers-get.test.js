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
const defaultTopicTriggerFactory = require('../../../../utils/factories/defaultTopicTrigger');

chai.should();
chai.use(sinonChai);

// module to be tested
const getDefaultTopicTriggersWithCampaignTopics = require('../../../../../lib/middleware/campaigns/index/defaultTopicTriggers-get');

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.req.campaign = stubs.getPhoenixCampaign();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('getDefaultTopicTriggersWithCampaignTopics should inject a changeTopicTriggers property set to helpers.defaultTopicTrigger.getAllWithCampaignTopics result', async (t) => {
  const next = sinon.stub();
  const middleware = getDefaultTopicTriggersWithCampaignTopics();
  const defaultTopicTriggers = [defaultTopicTriggerFactory.getValidDefaultTopicTriggerWithTopic()];
  sandbox.stub(helpers.defaultTopicTrigger, 'getAllWithCampaignTopics')
    .returns(Promise.resolve(defaultTopicTriggers));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.defaultTopicTrigger.getAllWithCampaignTopics.should.have.been.called;
  t.context.req.changeTopicTriggers.should.deep.equal(defaultTopicTriggers);
  next.should.have.been.called;
  helpers.sendErrorResponse.should.not.have.been.called;
});

test('getDefaultTopicTriggersWithCampaignTopics should sendErrorResponse if getByCampaignId fails', async (t) => {
  const next = sinon.stub();
  const middleware = getDefaultTopicTriggersWithCampaignTopics();
  const mockError = { message: 'Epic fail' };
  sandbox.stub(helpers.defaultTopicTrigger, 'getAllWithCampaignTopics')
    .returns(Promise.reject(mockError));

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.defaultTopicTrigger.getAllWithCampaignTopics.should.have.been.called;
  next.should.not.have.been.called;
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, mockError);
});
