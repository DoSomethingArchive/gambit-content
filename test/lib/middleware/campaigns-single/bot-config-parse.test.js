'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const underscore = require('underscore');

const stubs = require('../../../utils/stubs');
const helpers = require('../../../../lib/helpers');

const campaign = stubs.getPhoenixCampaign();

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const renderTemplates = require('../../../../lib/middleware/campaigns-single/bot-config-parse');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.req.campaign = campaign;
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('parseBotConfig does not call getTemplateNames if botConfig.undefined', (t) => {
  const middleware = renderTemplates();
  sandbox.spy(t.context.res, 'send');
  sandbox.spy(helpers.botConfig, 'getTemplateNames');

  middleware(t.context.req, t.context.res);
  helpers.botConfig.getTemplateNames.should.not.have.been.called;
  t.context.res.send.should.have.been.called;
});

test('renderTemplates injects a templates object, where properties are objects with template data', (t) => {
  const middleware = renderTemplates();
  const templateNames = helpers.botConfig.getTemplateNames();
  const mockPostType = 'photo';
  const mockRawText = stubs.getRandomString();
  const mockRenderedText = stubs.getRandomString();
  sandbox.spy(t.context.res, 'send');
  sandbox.spy(helpers.botConfig, 'getTemplateNames');
  sandbox.stub(helpers.botConfig, 'getTemplateDataFromBotConfig')
    .returns({ raw: mockRawText });
  sandbox.stub(helpers, 'replacePhoenixCampaignVars')
    .returns(mockRenderedText);
  sandbox.stub(helpers.botConfig, 'parsePostTypeFromBotConfig')
    .returns(mockPostType);
  t.context.req.botConfig = {};

  middleware(t.context.req, t.context.res);
  t.context.req.campaign.should.have.property('templates');
  t.context.req.campaign.botConfig.postType.should.equal(mockPostType);
  t.context.req.campaign.botConfig.templates.should.equal(t.context.req.campaign.templates);
  helpers.replacePhoenixCampaignVars.should.have.been.calledWith(mockRawText, campaign);
  templateNames.forEach((templateName) => {
    t.context.req.campaign.templates[templateName].raw.should.equal(mockRawText);
    t.context.req.campaign.templates[templateName].rendered.should.equal(mockRenderedText);
  });
  t.context.res.send.should.have.been.called;
});

test('renderTemplates calls sendErrorResponse if an error is caught', (t) => {
  const middleware = renderTemplates();
  t.context.req.botConfig = {};
  sandbox.stub(helpers.botConfig, 'getTemplateNames')
    .throws();

  middleware(t.context.req, t.context.res);
  helpers.sendErrorResponse.should.have.been.called;
});
