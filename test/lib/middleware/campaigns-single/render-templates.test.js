'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');

const stubs = require('../../../utils/stubs');
const helpers = require('../../../../lib/helpers');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const renderTemplates = require('../../../../lib/middleware/campaigns-single/render-templates');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  // setup res mock
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  t.context = {};
});


test('renderTemplates should inject a templates property', (t) => {
  // setup
  const middleware = renderTemplates();
  sandbox.stub(helpers.botConfig, 'getTemplateNames')
    .returns(['a', 'b', 'c']);
  sandbox.stub(helpers.botConfig, 'getTemplateDataFromBotConfig')
    .returns({});
  sandbox.stub(helpers, 'replacePhoenixCampaignVars')
    .returns('Winter');
  t.context.req.campaign = stubs.getPhoenixCampaign();
  t.context.req.campaign.botConfig = {};


  // test
  middleware(t.context.req, t.context.res);
  t.context.req.campaign.should.have.property('templates');
  t.context.req.campaign.botConfig.should.have.property('templates');
});
