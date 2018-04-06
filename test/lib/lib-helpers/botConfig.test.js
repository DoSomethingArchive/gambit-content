'use strict';

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contentful = require('../../../lib/contentful');
const stubs = require('../../utils/stubs');

const mockBotConfig = stubs.contentful.getEntries('default-campaign').items[0];
const mockTemplateName = stubs.getTemplateName();
const mockTemplateText = stubs.getRandomString();

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
    .returns(mockBotConfig);

  const result = await botConfigHelper.fetchByCampaignId(stubs.getCampaignId());
  contentful.fetchBotConfigByCampaignId.should.have.been.called;
  result.should.equal(mockBotConfig);
});

// getTemplateDataFromBotConfig
test('getTemplateFromBotConfigAndTemplateName returns default text when botConfig undefined', () => {
  sandbox.stub(botConfigHelper, 'getDefaultTextForBotConfigTemplateName')
    .returns(mockTemplateText);
  sandbox.stub(botConfigHelper, 'getTemplateTextFromBotConfigAndTemplateName')
    .returns(stubs.getRandomString());

  const result = botConfigHelper.getTemplateFromBotConfigAndTemplateName(null, mockTemplateName);
  botConfigHelper.getDefaultTextForBotConfigTemplateName.should.have.been.called;
  botConfigHelper.getTemplateTextFromBotConfigAndTemplateName.should.have.been.called;
  result.override.should.equal(false);
  result.raw.should.equal(mockTemplateText);
});

test('getTemplateFromBotConfigAndTemplateName returns botConfig text when botConfig override exists', () => {
  sandbox.stub(botConfigHelper, 'getDefaultTextForBotConfigTemplateName')
    .returns(stubs.getRandomString());
  sandbox.stub(botConfigHelper, 'getTemplateTextFromBotConfigAndTemplateName')
    .returns(mockTemplateText);

  const result = botConfigHelper
    .getTemplateFromBotConfigAndTemplateName(mockBotConfig, mockTemplateName);
  botConfigHelper.getDefaultTextForBotConfigTemplateName.should.not.have.been.called;
  botConfigHelper.getTemplateTextFromBotConfigAndTemplateName.should.have.been.called;
  result.override.should.equal(true);
  result.raw.should.equal(mockTemplateText);
});

// getTemplateTextFromBotConfigAndTemplateName
test('getTemplateTextFromBotConfigAndTemplateName returns the botConfig field value for templateName arg', () => {
  const result = botConfigHelper
    .getTemplateTextFromBotConfigAndTemplateName(mockBotConfig, mockTemplateName);
  result.should.deep.equal(mockBotConfig.fields.completedMenuMessage);
});
