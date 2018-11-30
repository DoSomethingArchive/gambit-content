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

const textPostConfigEntry = textPostConfigFactory.getValidTextPostConfig();
const topic = stubs.getTopic();
const topicContentType = 'textPostConfig';
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

// getTemplateInfoFromContentfulEntryAndTemplateName
test('getTemplateInfoFromContentfulEntryAndTemplateName returns an object', () => {
  const templateName = 'invalidText';
  const result = topicHelper
    .getTemplateInfoFromContentfulEntryAndTemplateName(textPostConfigEntry, templateName);
  result.should.equal(config.templatesByContentType.textPostConfig[templateName]);
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
  sandbox.stub(helpers.topic, 'getTopicTemplates')
    .returns(stubTemplates);

  const result = await topicHelper.parseTopicFromContentfulEntry(textPostConfig);
  helpers.contentfulEntry.getSummaryFromContentfulEntry.should.have.been.calledWith(textPostConfig);
  result.name.should.equal(stubSummary.name);
  helpers.topic.getPostTypeFromContentType.should.have.been.calledWith(stubPostType);
  result.postType.should.equal(stubPostType);
  helpers.campaign.getById
    .should.have.been.calledWith(textPostConfig.fields.campaign.fields.campaignId);
  result.campaign.should.deep.equal(stubCampaign);
  helpers.topic.getTopicTemplates
    .should.have.been.calledWith(textPostConfig, stubCampaign);
  result.templates.should.deep.equal(stubTemplates);
});

test('parseTopicFromContentfulEntry does not get campaign by id if campaign field undefined', async () => {
  const textPostConfig = autoReplyFactory.getValidAutoReplyWithoutCampaign();
  sandbox.stub(helpers.campaign, 'getById')
    .returns(Promise.resolve({ data: { title: stubs.getRandomName() } }));
  sandbox.stub(helpers.topic, 'getTopicTemplates')
    .returns({});

  const result = await topicHelper.parseTopicFromContentfulEntry(textPostConfig);
  helpers.campaign.getById.should.not.have.been.called;
  result.campaign.should.deep.equal({});
});
