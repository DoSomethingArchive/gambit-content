'use strict';

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contentful = require('../../../lib/contentful');
const stubs = require('../../utils/stubs');
const config = require('../../../config/lib/helpers/botConfig');

const botConfig = stubs.contentful.getEntries('default-campaign').items[0];
const botConfigTemplates = config.templates.botConfig;
const postConfigContentType = 'textPostConfig';
const postType = config.postTypesByContentType[postConfigContentType];
const templateName = stubs.getTemplateName();
const templateText = stubs.getRandomString();

// Module to test
const botConfigHelper = require('../../../lib/helpers/botConfig');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

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
test('getDefaultTextForBotConfigTemplateName returns default for templateName', () => {
  const result = botConfigHelper.getDefaultTextForBotConfigTemplateName(templateName);
  result.should.equal(botConfigTemplates[templateName].default);
});

// getTemplateDataFromBotConfig
test('getTemplateFromBotConfigAndTemplateName returns default text when botConfig undefined', () => {
  sandbox.stub(botConfigHelper, 'getDefaultTextForBotConfigTemplateName')
    .returns(templateText);
  sandbox.stub(botConfigHelper, 'getTemplateTextFromBotConfigAndTemplateName')
    .returns(stubs.getRandomString());

  const result = botConfigHelper.getTemplateFromBotConfigAndTemplateName(null, templateName);
  botConfigHelper.getDefaultTextForBotConfigTemplateName.should.have.been.called;
  botConfigHelper.getTemplateTextFromBotConfigAndTemplateName.should.have.been.called;
  result.override.should.equal(false);
  result.raw.should.equal(templateText);
});

test('getTemplateFromBotConfigAndTemplateName returns template text when botConfig value exists', () => {
  sandbox.stub(botConfigHelper, 'getDefaultTextForBotConfigTemplateName')
    .returns(stubs.getRandomString());
  sandbox.stub(botConfigHelper, 'getTemplateTextFromBotConfigAndTemplateName')
    .returns(templateText);

  const result = botConfigHelper
    .getTemplateFromBotConfigAndTemplateName(botConfig, templateName);
  botConfigHelper.getDefaultTextForBotConfigTemplateName.should.not.have.been.called;
  botConfigHelper.getTemplateTextFromBotConfigAndTemplateName.should.have.been.called;
  result.override.should.equal(true);
  result.raw.should.equal(templateText);
});

// getTemplateTextFromBotConfigAndTemplateName
test('getTemplateTextFromBotConfigAndTemplateName returns the botConfig field value for templateName arg', () => {
  const result = botConfigHelper
    .getTemplateTextFromBotConfigAndTemplateName(botConfig, templateName);
  result.should.deep.equal(botConfig.fields.completedMenuMessage);
});

test('getTemplateTextFromBotConfigAndTemplateName returns null if botConfig undefined', (t) => {
  t.falsy(botConfigHelper.getTemplateTextFromBotConfigAndTemplateName(null, templateName));
});

// getTemplatesFromBotConfig
test('getTemplatesFromBotConfig returns an object with template names as properties', () => {
  const templateData = { raw: templateText };
  sandbox.stub(botConfigHelper, 'getTemplateFromBotConfigAndTemplateName')
    .returns(templateData);
  const result = botConfigHelper.getTemplatesFromBotConfig(botConfig);
  Object.keys(botConfigTemplates).forEach((name) => {
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
