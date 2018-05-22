'use strict';

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contentful = require('../../../lib/contentful');
const stubs = require('../../utils/stubs');
const config = require('../../../config/lib/helpers/topic');

const topic = stubs.contentful.getEntries('default-campaign').items[0];
const campaignTemplates = config.templatesByContentType.campaign;
const topicContentType = 'campaign';
const postConfigContentType = 'textPostConfig';
const postType = config.postTypesByContentType[postConfigContentType];
const templateName = stubs.getTemplateName();
const templateText = stubs.getRandomString();

// Module to test
const topicHelper = require('../../../lib/helpers/topic');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.beforeEach(() => {
  sandbox.stub(contentful, 'getContentTypeFromContentfulEntry')
    .returns(topicContentType);
});

test.afterEach(() => {
  sandbox.restore();
});

// fetchByCampaignId
test('fetchByCampaignId returns contentful.fetchBotConfigByCampaignId', async () => {
  sandbox.stub(contentful, 'fetchBotConfigByCampaignId')
    .returns(topic);

  const result = await topicHelper.fetchByCampaignId(stubs.getCampaignId());
  contentful.fetchBotConfigByCampaignId.should.have.been.called;
  result.should.equal(topic);
});

// getDefaultTextForBotConfigTemplateName
test('getDefaultValueFromContentfulEntryAndTemplateName returns default for templateName', () => {
  const result = topicHelper
    .getDefaultValueFromContentfulEntryAndTemplateName(topic, templateName);
  result.should.equal(campaignTemplates[templateName].default);
});

// getTemplateFromContentfulEntryAndTemplateName
test('getTemplateFromContentfulEntryAndTemplateName returns default text when no field value exists', () => {
  sandbox.stub(topicHelper, 'getDefaultValueFromContentfulEntryAndTemplateName')
    .returns(templateText);
  sandbox.stub(topicHelper, 'getFieldValueFromContentfulEntryAndTemplateName')
    .returns(null);

  const result = topicHelper
    .getTemplateFromContentfulEntryAndTemplateName(topic, templateName);
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
    .getTemplateFromContentfulEntryAndTemplateName(topic, templateName);
  topicHelper.getDefaultValueFromContentfulEntryAndTemplateName.should.not.have.been.called;
  topicHelper.getFieldValueFromContentfulEntryAndTemplateName.should.have.been.called;
  result.override.should.equal(true);
  result.raw.should.equal(templateText);
});

// getFieldValueFromContentfulEntryAndTemplateName
test('getFieldValueFromContentfulEntryAndTemplateName returns the entry field value for templateName', () => {
  const result = topicHelper
    .getFieldValueFromContentfulEntryAndTemplateName(topic, templateName);
  result.should.deep.equal(topic.fields.memberSupportMessage);
});

// getTemplatesFromBotConfig
test('getTemplatesFromBotConfig returns an object with template names as properties', () => {
  const templateData = { raw: templateText };
  sandbox.stub(topicHelper, 'getTemplateFromContentfulEntryAndTemplateName')
    .returns(templateData);
  const result = topicHelper.getTemplatesFromBotConfig(topic);
  Object.keys(campaignTemplates).forEach((name) => {
    result[name].should.deep.equal(templateData);
  });
});

// getPostTypeFromBotConfig
test('getPostTypeFromBotConfig returns the topic field value for templateName arg', () => {
  sandbox.stub(contentful, 'parsePostConfigContentTypeFromBotConfig')
    .returns(postConfigContentType);
  const result = topicHelper.getPostTypeFromBotConfig(topic);
  result.should.equal(postType);
});
