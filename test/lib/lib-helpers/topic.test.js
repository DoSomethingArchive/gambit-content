'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contentful = require('../../../lib/contentful');
const helpers = require('../../../lib/helpers');
const stubs = require('../../utils/stubs');
const config = require('../../../config/lib/helpers/topic');

const campaignId = stubs.getCampaignId();
const campaignConfig = stubs.contentful.getEntries('default-campaign').items[0];
const campaignTemplates = config.templatesByContentType.campaign;
const campaignConfigContentType = 'campaign';
const topicContentType = 'textPostConfig';
const templateName = stubs.getTemplateName();
const templateText = stubs.getRandomString();
const topic = stubs.getTopic();
const topicId = stubs.getContentfulId();

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

// fetchAll
test('fetchAll returns contentful.fetchByContentTypes parsed as topic objects', async () => {
  const fetchTopicsEntriesResult = [{ id: '132' }];
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.resolve(fetchTopicsEntriesResult));
  sandbox.stub(topicHelper, 'parseTopicFromContentfulEntry')
    .returns(Promise.resolve(topic));


  const result = await topicHelper.fetchAll();
  contentful.fetchByContentTypes.should.have.been.calledWith(config.topicContentTypes);
  fetchTopicsEntriesResult.forEach((item) => {
    topicHelper.parseTopicFromContentfulEntry.should.have.been.calledWith(item);
  });
  result.should.deep.equal([topic]);
});

test('fetchAll throws if contentful.fetchByContentTypes fails', async (t) => {
  const error = new Error('epic fail');
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.reject(error));
  sandbox.stub(topicHelper, 'parseTopicFromContentfulEntry')
    .returns(Promise.resolve(topic));


  const result = await t.throws(topicHelper.fetchAll());
  result.should.deep.equal(error);
});

// fetchById
test('fetchById returns contentful.fetchByContentfulId parsed as topic object', async () => {
  const fetchEntryResult = { id: '132' };
  sandbox.stub(contentful, 'fetchByContentfulId')
    .returns(Promise.resolve(fetchEntryResult));
  sandbox.stub(topicHelper, 'parseTopicFromContentfulEntry')
    .returns(Promise.resolve(topic));


  const result = await topicHelper.fetchById(topicId);
  contentful.fetchByContentfulId.should.have.been.calledWith(topicId);
  topicHelper.parseTopicFromContentfulEntry.should.have.been.calledWith(fetchEntryResult);
  result.should.deep.equal(topic);
});

// getAll
test('getAll returns allTopics cache if set', async () => {
  const allTopicsCacheResult = [{ id: '132' }];
  sandbox.stub(helpers.cache.topics, 'get')
    .returns(Promise.resolve(allTopicsCacheResult));
  sandbox.stub(topicHelper, 'fetchAll')
    .returns(Promise.resolve(allTopicsCacheResult));


  const result = await topicHelper.getAll();
  helpers.cache.topics.get.should.have.been.calledWith(config.allTopicsCacheKey);
  topicHelper.fetchAll.should.not.have.been.called;
  result.should.deep.equal(allTopicsCacheResult);
});

test('getAll returns fetchAll results if cache not set', async () => {
  const allTopics = [{ id: '132' }];
  sandbox.stub(helpers.cache.topics, 'get')
    .returns(Promise.resolve(null));
  sandbox.stub(topicHelper, 'fetchAll')
    .returns(Promise.resolve(allTopics));
  sandbox.stub(helpers.cache.topics, 'set')
    .returns(Promise.resolve(allTopics));

  const result = await topicHelper.getAll();
  helpers.cache.topics.get.should.have.been.calledWith(config.allTopicsCacheKey);
  topicHelper.fetchAll.should.have.been.called;
  result.should.deep.equal(allTopics);
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
test('getDefaultTextFromContentfulEntryAndTemplateName returns default for templateName', () => {
  const result = topicHelper
    .getDefaultTextFromContentfulEntryAndTemplateName(campaignConfig, templateName);
  result.should.equal(campaignTemplates[templateName].defaultText);
});

// parseTemplateFromContentfulEntryAndTemplateName
test('parseTemplateFromContentfulEntryAndTemplateName returns default text when no field value exists', () => {
  sandbox.stub(topicHelper, 'getDefaultTextFromContentfulEntryAndTemplateName')
    .returns(templateText);
  sandbox.stub(topicHelper, 'getFieldValueFromContentfulEntryAndTemplateName')
    .returns(null);

  const result = topicHelper
    .parseTemplateFromContentfulEntryAndTemplateName(campaignConfig, templateName);
  topicHelper.getDefaultTextFromContentfulEntryAndTemplateName.should.have.been.called;
  topicHelper.getFieldValueFromContentfulEntryAndTemplateName.should.have.been.called;
  result.override.should.equal(false);
  result.raw.should.equal(templateText);
});

test('parseTemplateFromContentfulEntryAndTemplateName returns template text when topic value exists', () => {
  sandbox.stub(topicHelper, 'getDefaultTextFromContentfulEntryAndTemplateName')
    .returns(stubs.getRandomString());
  sandbox.stub(topicHelper, 'getFieldValueFromContentfulEntryAndTemplateName')
    .returns(templateText);

  const result = topicHelper
    .parseTemplateFromContentfulEntryAndTemplateName(campaignConfig, templateName);
  topicHelper.getDefaultTextFromContentfulEntryAndTemplateName.should.not.have.been.called;
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
