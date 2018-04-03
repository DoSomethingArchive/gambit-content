'use strict';

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const stubs = require('../../utils/stubs');

const mockTemplateName = stubs.getTemplateName();
const mockTemplateText = stubs.getRandomString();

const config = require('../../../config/lib/helpers/botConfig');

const botConfigStub = stubs.contentful.getEntries('default-campaign').items[0];

// Module to test
const botConfigHelper = require('../../../lib/helpers/botConfig');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.afterEach(() => {
  sandbox.restore();
});

// getTemplateNames
test('getTemplateNames returns the keys of config.templates', () => {
  const result = botConfigHelper.getTemplateNames();
  result.should.deep.equal(Object.keys(config.templates));
});

// getTemplateDataFromBotConfig
test('getTemplateDataFromBotConfig returns default text when botConfig arg undefined', () => {
  sandbox.stub(botConfigHelper, 'getDefaultTemplateText')
    .returns(mockTemplateText);
  sandbox.stub(botConfigHelper, 'getTemplateTextFromBotConfig')
    .returns(stubs.getRandomString());

  const result = botConfigHelper.getTemplateDataFromBotConfig(null, mockTemplateName);
  botConfigHelper.getDefaultTemplateText.should.have.been.called;
  botConfigHelper.getTemplateTextFromBotConfig.should.not.have.been.called;
  result.override.should.equal(false);
  result.raw.should.equal(mockTemplateText);
});

test('getTemplateDataFromBotConfig returns botConfig text when botConfig override exists', () => {
  sandbox.stub(botConfigHelper, 'getDefaultTemplateText')
    .returns(stubs.getRandomString());
  sandbox.stub(botConfigHelper, 'getTemplateTextFromBotConfig')
    .returns(mockTemplateText);

  const result = botConfigHelper.getTemplateDataFromBotConfig(botConfigStub, mockTemplateName);
  botConfigHelper.getDefaultTemplateText.should.not.have.been.called;
  botConfigHelper.getTemplateTextFromBotConfig.should.have.been.called;
  result.override.should.equal(true);
  result.raw.should.equal(mockTemplateText);
});