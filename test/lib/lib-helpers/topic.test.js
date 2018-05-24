'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contentful = require('../../../lib/contentful');
const stubs = require('../../utils/stubs');
const config = require('../../../config/lib/helpers/topic');

const campaignId = stubs.getCampaignId();
const campaignConfig = stubs.contentful.getEntries('default-campaign').items[0];
const campaignTemplates = config.templatesByContentType.campaign;
const campaignConfigContentType = 'campaign';
const topicContentType = 'textPostConfig';
const templateName = stubs.getTemplateName();
const templateText = stubs.getRandomString();

// Module to test
const topicHelper = require('../../../lib/helpers/topic');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.beforeEach(() => {
  sandbox.stub(contentful, 'getContentTypeFromContentfulEntry')
    .returns(campaignConfigContentType);
});

test.afterEach(() => {
  sandbox.restore();
});

// getByCampaignId
test('getByCampaignId returns filtered results of getAll', async () => {
  const getTopicsResult = [{ id: '132' }];
  sandbox.stub(topicHelper, 'getAll')
    .returns(Promise.resolve(getTopicsResult));
  sandbox.stub(getTopicsResult, 'filter')
    .returns(getTopicsResult);

  const result = await topicHelper.getByCampaignId(campaignId);
  topicHelper.getAll.should.have.been.called;
  getTopicsResult.filter.should.have.been.called;
  result.should.deep.equal(getTopicsResult);
});

// getDefaultTextForBotConfigTemplateName
test('getDefaultValueFromContentfulEntryAndTemplateName returns default for templateName', () => {
  const result = topicHelper
    .getDefaultValueFromContentfulEntryAndTemplateName(campaignConfig, templateName);
  result.should.equal(campaignTemplates[templateName].default);
});

// getTemplateFromContentfulEntryAndTemplateName
test('getTemplateFromContentfulEntryAndTemplateName returns default text when no field value exists', () => {
  sandbox.stub(topicHelper, 'getDefaultValueFromContentfulEntryAndTemplateName')
    .returns(templateText);
  sandbox.stub(topicHelper, 'getFieldValueFromContentfulEntryAndTemplateName')
    .returns(null);

  const result = topicHelper
    .getTemplateFromContentfulEntryAndTemplateName(campaignConfig, templateName);
  topicHelper.getDefaultValueFromContentfulEntryAndTemplateName.should.have.been.called;
  topicHelper.getFieldValueFromContentfulEntryAndTemplateName.should.have.been.called;
  result.override.should.equal(false);
  result.raw.should.equal(templateText);
});

test('getTemplateFromContentfulEntryAndTemplateName returns template text when topic value exists', () => {
  sandbox.stub(topicHelper, 'getDefaultValueFromContentfulEntryAndTemplateName')
    .returns(stubs.getRandomString());
  sandbox.stub(topicHelper, 'getFieldValueFromContentfulEntryAndTemplateName')
    .returns(templateText);

  const result = topicHelper
    .getTemplateFromContentfulEntryAndTemplateName(campaignConfig, templateName);
  topicHelper.getDefaultValueFromContentfulEntryAndTemplateName.should.not.have.been.called;
  topicHelper.getFieldValueFromContentfulEntryAndTemplateName.should.have.been.called;
  result.override.should.equal(true);
  result.raw.should.equal(templateText);
});

// getFieldValueFromContentfulEntryAndTemplateName
test('getFieldValueFromContentfulEntryAndTemplateName returns the entry field value for templateName', () => {
  const result = topicHelper
    .getFieldValueFromContentfulEntryAndTemplateName(campaignConfig, templateName);
  result.should.deep.equal(campaignConfig.fields.memberSupportMessage);
});

// getPostTypeFromContentType
test('getPostTypeFromContentType returns the topic field value for templateName arg', () => {
  const result = topicHelper.getPostTypeFromContentType(topicContentType);
  result.should.equal(config.postTypesByContentType[topicContentType]);
});
