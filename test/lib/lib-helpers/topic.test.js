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
const askYesNoFactory = require('../../utils/factories/contentful/askYesNo');
const autoReplyFactory = require('../../utils/factories/contentful/autoReply');
const textPostConfigFactory = require('../../utils/factories/contentful/textPostConfig');
const broadcastFactory = require('../../utils/factories/broadcast');

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

test.afterEach(() => {
  sandbox.restore();
});

// fetch
test('fetch returns contentful.fetchByContentTypes parsed as topic objects', async () => {
  const contentTypes = [topicContentType];
  const entries = [textPostConfigFactory.getValidTextPostConfig()];
  const fetchEntriesResult = stubs.contentful.getFetchByContentTypesResultWithArray(entries);
  sandbox.stub(topicHelper, 'getContentTypes')
    .returns(contentTypes);
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.resolve(fetchEntriesResult));
  sandbox.stub(topicHelper, 'parseTopicFromContentfulEntry')
    .returns(Promise.resolve(topic));

  const result = await topicHelper.fetch();
  contentful.fetchByContentTypes.should.have.been.calledWith(contentTypes, {});
  entries.forEach((entry) => {
    topicHelper.parseTopicFromContentfulEntry.should.have.been.calledWith(entry);
  });
  result.data.should.deep.equal([topic]);
});

test('fetch throws if contentful.fetchByContentTypes fails', async (t) => {
  const error = new Error('epic fail');
  sandbox.stub(contentful, 'fetchByContentTypes')
    .returns(Promise.reject(error));
  sandbox.stub(topicHelper, 'parseTopicFromContentfulEntry')
    .returns(Promise.resolve(topic));


  const result = await t.throws(topicHelper.fetch());
  result.should.deep.equal(error);
});

// fetchById
test('fetchById returns contentful.fetchByContentfulId parsed as cached topic object', async () => {
  const fetchEntryResult = { id: '132' };
  sandbox.stub(contentful, 'fetchByContentfulId')
    .returns(Promise.resolve(fetchEntryResult));
  sandbox.stub(topicHelper, 'parseTopicFromContentfulEntry')
    .returns(Promise.resolve(topic));
  sandbox.stub(helpers.cache.topics, 'set')
    .returns(Promise.resolve(topic));


  const result = await topicHelper.fetchById(topicId);
  contentful.fetchByContentfulId.should.have.been.calledWith(topicId);
  topicHelper.parseTopicFromContentfulEntry.should.have.been.calledWith(fetchEntryResult);
  result.should.deep.equal(topic);
  helpers.cache.topics.set.should.have.been.calledWith(topicId, topic);
});

// getAll
test('getAll returns allTopics cache if set', async () => {
  const allTopicsCacheResult = [{ id: '132' }];
  sandbox.stub(helpers.cache.topics, 'get')
    .returns(Promise.resolve(allTopicsCacheResult));
  sandbox.stub(topicHelper, 'fetch')
    .returns(Promise.resolve(allTopicsCacheResult));


  const result = await topicHelper.getAll();
  helpers.cache.topics.get.should.have.been.calledWith(config.allTopicsCacheKey);
  topicHelper.fetch.should.not.have.been.called;
  result.should.deep.equal(allTopicsCacheResult);
});

test('getAll returns fetch results if cache not set', async () => {
  const allTopics = [{ id: '132' }];
  sandbox.stub(helpers.cache.topics, 'get')
    .returns(Promise.resolve(null));
  sandbox.stub(topicHelper, 'fetch')
    .returns(Promise.resolve({ data: allTopics }));
  sandbox.stub(helpers.cache.topics, 'set')
    .returns(Promise.resolve(allTopics));

  const result = await topicHelper.getAll();
  helpers.cache.topics.get.should.have.been.calledWith(config.allTopicsCacheKey);
  topicHelper.fetch.should.have.been.called;
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

// getById
test('getById returns topics cache if set', async () => {
  sandbox.stub(helpers.cache.topics, 'get')
    .returns(Promise.resolve(topic));
  sandbox.stub(topicHelper, 'fetchById')
    .returns(Promise.resolve(topic));

  const result = await topicHelper.getById(topicId);
  helpers.cache.topics.get.should.have.been.calledWith(topicId);
  topicHelper.fetchById.should.not.have.been.called;
  result.should.deep.equal(topic);
});

test('getById returns fetchById and sets cache if cache not set', async () => {
  sandbox.stub(helpers.cache.topics, 'get')
    .returns(Promise.resolve(null));
  sandbox.stub(topicHelper, 'fetchById')
    .returns(Promise.resolve(topic));

  const result = await topicHelper.getById(topicId);
  helpers.cache.topics.get.should.have.been.calledWith(topicId);
  topicHelper.fetchById.should.have.been.calledWith(topicId);
  result.should.deep.equal(topic);
});

test('getById returns fetchById if resetCache arg is true', async () => {
  sandbox.stub(helpers.cache.topics, 'get')
    .returns(Promise.resolve(null));
  sandbox.stub(topicHelper, 'fetchById')
    .returns(Promise.resolve(topic));

  const result = await topicHelper.getById(topicId, true);
  helpers.cache.topics.get.should.not.have.been.called;
  topicHelper.fetchById.should.have.been.calledWith(topicId);
  result.should.deep.equal(topic);
});

// getDefaultTextForBotConfigTemplateName
test('getDefaultTextFromContentfulEntryAndTemplateName returns default for templateName', () => {
  const result = topicHelper
    .getDefaultTextFromContentfulEntryAndTemplateName(campaignConfig, templateName);
  result.should.equal(campaignTemplates[templateName].defaultText);
});

// getTemplateInfoFromContentfulEntryAndTemplateName
test('getTemplateInfoFromContentfulEntryAndTemplateName returns an object', () => {
  sandbox.stub(contentful, 'getContentTypeFromContentfulEntry')
    .returns(campaignConfigContentType);
  const result = topicHelper
    .getTemplateInfoFromContentfulEntryAndTemplateName(campaignConfig, templateName);
  contentful.getContentTypeFromContentfulEntry.should.have.been.called;
  result.should.equal(config.templatesByContentType[campaignConfigContentType][templateName]);
});

// parseRawAndOverrideFromContentfulEntryAndTemplateName
test('parseRawAndOverrideFromContentfulEntryAndTemplateName returns default text when no field value exists', () => {
  sandbox.stub(topicHelper, 'getDefaultTextFromContentfulEntryAndTemplateName')
    .returns(templateText);
  sandbox.stub(topicHelper, 'getFieldValueFromContentfulEntryAndTemplateName')
    .returns(null);

  const result = topicHelper
    .parseRawAndOverrideFromContentfulEntryAndTemplateName(campaignConfig, templateName);
  topicHelper.getDefaultTextFromContentfulEntryAndTemplateName.should.have.been.called;
  topicHelper.getFieldValueFromContentfulEntryAndTemplateName.should.have.been.called;
  result.override.should.equal(false);
  result.raw.should.equal(templateText);
});

test('parseRawAndOverrideFromContentfulEntryAndTemplateName returns template text when topic value exists', () => {
  sandbox.stub(topicHelper, 'getDefaultTextFromContentfulEntryAndTemplateName')
    .returns(stubs.getRandomString());
  sandbox.stub(topicHelper, 'getFieldValueFromContentfulEntryAndTemplateName')
    .returns(templateText);

  const result = topicHelper
    .parseRawAndOverrideFromContentfulEntryAndTemplateName(campaignConfig, templateName);
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
test('getPostTypeFromContentType returns postType string property from contentTypeConfig', () => {
  const result = topicHelper.getPostTypeFromContentType(topicContentType);
  const contentTypeConfigs = helpers.contentfulEntry.getContentTypeConfigs();
  result.should.equal(contentTypeConfigs[topicContentType].postType);
});

// parseTopicFromContentfulEntry
test('parseTopicFromContentfulEntry returns parseBroadcastFromContentfulEntry if contentfulEntry is broadcastable', async () => {
  const askYesNo = askYesNoFactory.getValidAskYesNo();
  const broadcast = broadcastFactory.getValidBroadcast();
  sandbox.stub(helpers.contentfulEntry, 'isBroadcastable')
    .returns(true);
  sandbox.stub(helpers.broadcast, 'parseBroadcastFromContentfulEntry')
    .returns(Promise.resolve(broadcast));

  const result = await topicHelper.parseTopicFromContentfulEntry(askYesNo);
  result.should.deep.equal(broadcast);
});

test('parseTopicFromContentfulEntry gets campaign by id if campaign field is set', async () => {
  const textPostConfig = textPostConfigFactory.getValidTextPostConfig();
  const stubCampaign = { title: stubs.getRandomName() };
  const stubPostType = topicContentType;
  const stubSummary = { name: stubs.getRandomName() };
  const stubTemplates = { askText: stubs.getRandomMessageText() };
  sandbox.stub(helpers.contentfulEntry, 'getSummaryFromContentfulEntry')
    .returns(stubSummary);
  sandbox.stub(helpers.topic, 'getPostTypeFromContentType')
    .returns(stubPostType);
  sandbox.stub(helpers.campaign, 'getById')
    .returns(Promise.resolve(stubCampaign));
  sandbox.stub(helpers.topic, 'getTopicTemplatesWithDefaultsFromContentfulEntryAndCampaign')
    .returns(stubTemplates);

  const result = await topicHelper.parseTopicFromContentfulEntry(textPostConfig);
  helpers.contentfulEntry.getSummaryFromContentfulEntry.should.have.been.calledWith(textPostConfig);
  result.name.should.equal(stubSummary.name);
  helpers.topic.getPostTypeFromContentType.should.have.been.calledWith(stubPostType);
  result.postType.should.equal(stubPostType);
  helpers.campaign.getById
    .should.have.been.calledWith(textPostConfig.fields.campaign.fields.campaignId);
  result.campaign.should.deep.equal(stubCampaign);
  helpers.topic.getTopicTemplatesWithDefaultsFromContentfulEntryAndCampaign
    .should.have.been.calledWith(textPostConfig, stubCampaign);
  result.templates.should.deep.equal(stubTemplates);
});

test('parseTopicFromContentfulEntry does not get campaign by id if campaign field undefined', async () => {
  const textPostConfig = autoReplyFactory.getValidAutoReplyWithoutCampaign();
  sandbox.stub(helpers.campaign, 'getById')
    .returns(Promise.resolve({ data: { title: stubs.getRandomName() } }));
  sandbox.stub(helpers.topic, 'getTopicTemplatesWithDefaultsFromContentfulEntryAndCampaign')
    .returns({});

  const result = await topicHelper.parseTopicFromContentfulEntry(textPostConfig);
  helpers.campaign.getById.should.not.have.been.called;
  result.campaign.should.deep.equal({});
});
