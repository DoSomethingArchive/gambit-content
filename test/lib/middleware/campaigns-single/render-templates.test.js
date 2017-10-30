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


test('renderTemplates should inject a rendered property', (t) => {
  // setup
  const middleware = renderTemplates();
  sandbox.stub(helpers, 'replacePhoenixCampaignVars');
  const contentfulCampaigns = stubs.contentful.getEntries('campaign').items;
  t.context.req.campaign = {};
  t.context.req.contentfulCampaigns = {
    override: contentfulCampaigns[0],
    default: contentfulCampaigns[1],
  };

  // test
  middleware(t.context.req, t.context.res);
  const templateNames = Object.keys(t.context.req.campaign.templates);
  templateNames.forEach((templateName) => {
    const template = t.context.req.campaign.templates[templateName];
    const properties = ['override', 'raw', 'rendered'];
    properties.forEach(property => template.should.have.property(property));
  });
});
