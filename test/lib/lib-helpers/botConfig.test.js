'use strict';

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contentful = require('../../../lib/contentful');
const stubs = require('../../utils/stubs');
const config = require('../../../config/lib/helpers/botConfig');

const botConfig = stubs.contentful.getEntries('default-campaign').items[0];
const campaignTemplates = config.templatesByContentType.campaign;
const botConfigContentType = 'campaign';
const postConfigContentType = 'textPostConfig';
const postType = config.postTypesByContentType[postConfigContentType];
const templateName = stubs.getTemplateName();
const templateText = stubs.getRandomString();

// Module to test
const botConfigHelper = require('../../../lib/helpers/botConfig');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.beforeEach(() => {
  sandbox.stub(contentful, 'parseContentTypeFromContentfulEntry')
    .returns(botConfigContentType);
});

test.afterEach(() => {
  sandbox.restore();
});

// fetchByCampaignId
test('fetchByCampaignId returns contentful.fetchBotConfigByCampaignId', async () => {
  sandbox.stub(contentful, 'fetchBotConfigByCampaignId')
    .returns(botConfig);

  const result = await botConfigHelper.fetchByCampaignId(stubs.getCampaignId());
  contentful.fetchBotConfigByCampaignId.should.have.been.called;
  result.should.equal(botConfig);
});

// getDefaultTextForBotConfigTemplateName
test('getDefaultValueFromContentfulEntryAndTemplateName returns default for templateName', () => {
  const result = botConfigHelper
    .getDefaultValueFromContentfulEntryAndTemplateName(botConfig, templateName);
  result.should.equal(campaignTemplates[templateName].default);
});

// getTemplateFromContentfulEntryAndTemplateName
test('getTemplateFromContentfulEntryAndTemplateName returns default text when no field value exists', () => {
  sandbox.stub(botConfigHelper, 'getDefaultValueFromContentfulEntryAndTemplateName')
    .returns(templateText);
  sandbox.stub(botConfigHelper, 'getFieldValueFromContentfulEntryAndTemplateName')
    .returns(null);

  const result = botConfigHelper
    .getTemplateFromContentfulEntryAndTemplateName(botConfig, templateName);
  botConfigHelper.getDefaultValueFromContentfulEntryAndTemplateName.should.have.been.called;
  botConfigHelper.getFieldValueFromContentfulEntryAndTemplateName.should.have.been.called;
  result.override.should.equal(false);
  result.raw.should.equal(templateText);
});

test('getTemplateFromContentfulEntryAndTemplateName returns template text when botConfig value exists', () => {
  sandbox.stub(botConfigHelper, 'getDefaultValueFromContentfulEntryAndTemplateName')
    .returns(stubs.getRandomString());
  sandbox.stub(botConfigHelper, 'getFieldValueFromContentfulEntryAndTemplateName')
    .returns(templateText);

  const result = botConfigHelper
    .getTemplateFromContentfulEntryAndTemplateName(botConfig, templateName);
  botConfigHelper.getDefaultValueFromContentfulEntryAndTemplateName.should.not.have.been.called;
  botConfigHelper.getFieldValueFromContentfulEntryAndTemplateName.should.have.been.called;
  result.override.should.equal(true);
  result.raw.should.equal(templateText);
});

// getFieldValueFromContentfulEntryAndTemplateName
test('getFieldValueFromContentfulEntryAndTemplateName returns the entry field value for templateName', () => {
  const result = botConfigHelper
    .getFieldValueFromContentfulEntryAndTemplateName(botConfig, templateName);
  result.should.deep.equal(botConfig.fields.memberSupportMessage);
});

// getTemplatesFromBotConfig
test('getTemplatesFromBotConfig returns an object with template names as properties', () => {
  const templateData = { raw: templateText };
  sandbox.stub(botConfigHelper, 'getTemplateFromContentfulEntryAndTemplateName')
    .returns(templateData);
  const result = botConfigHelper.getTemplatesFromBotConfig(botConfig);
  Object.keys(campaignTemplates).forEach((name) => {
    result[name].should.deep.equal(templateData);
  });
});

// getPostTypeFromBotConfig
test('getPostTypeFromBotConfig returns the botConfig field value for templateName arg', () => {
  sandbox.stub(contentful, 'parsePostConfigContentTypeFromBotConfig')
    .returns(postConfigContentType);
  const result = botConfigHelper.getPostTypeFromBotConfig(botConfig);
  result.should.equal(postType);
});
