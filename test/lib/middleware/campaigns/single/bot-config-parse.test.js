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
const templateName = stubs.getTemplateName();

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const renderTemplates = require('../../../../../lib/middleware/campaigns/single/bot-config-parse');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.req.campaign = campaign;
  t.context.req.botConfig = {};
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});


test('renderTemplates injects a templates object, where properties are objects with template data', (t) => {
  const middleware = renderTemplates();
  const templateNames = [templateName];
  const mockPostType = stubs.getPostType();
  const mockRawText = stubs.getRandomString();
  const mockRenderedText = stubs.getRandomString();
  const mockTemplates = {};
  mockTemplates[templateName] = { raw: mockRawText };
  sandbox.stub(helpers.botConfig, 'getTemplatesFromBotConfig')
    .returns(mockTemplates);
  sandbox.stub(helpers, 'replacePhoenixCampaignVars')
    .returns(mockRenderedText);
  sandbox.stub(helpers.botConfig, 'getPostTypeFromBotConfig')
    .returns(mockPostType);
  sandbox.spy(t.context.res, 'send');

  middleware(t.context.req, t.context.res);
  t.context.req.campaign.botConfig.should.have.property('templates');
  t.context.req.campaign.botConfig.postType.should.equal(mockPostType);
  helpers.replacePhoenixCampaignVars.should.have.been.calledWith(mockRawText, campaign);
  templateNames.forEach((name) => {
    const template = t.context.req.campaign.botConfig.templates[name];
    template.raw.should.equal(mockRawText);
    template.rendered.should.equal(mockRenderedText);
  });
  t.context.res.send.should.have.been.called;
});

test('renderTemplates calls sendErrorResponse if an error is caught', (t) => {
  const middleware = renderTemplates();
  sandbox.stub(helpers.botConfig, 'getTemplatesFromBotConfig')
    .throws();

  middleware(t.context.req, t.context.res);
  helpers.sendErrorResponse.should.have.been.called;
});
