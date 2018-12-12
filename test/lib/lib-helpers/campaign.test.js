'use strict';

// env variables
require('dotenv').config();

// Libraries
const test = require('ava');
const chai = require('chai');
const logger = require('winston');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const helpers = require('../../../lib/helpers');
const gateway = require('../../../lib/gateway');
const contentful = require('../../../lib/contentful');
const stubs = require('../../utils/stubs');
const campaignEntryFactory = require('../../utils/factories/contentful/campaign');
const rogueCampaignFactory = require('../../utils/factories/rogue/campaign');
const campaignFactory = require('../../utils/factories/campaign');

const rogueCampaign = rogueCampaignFactory.getValidCampaign();
const campaign = campaignFactory.getValidCampaign();
const campaignId = campaign.id;
const campaignConfigEntry = campaignEntryFactory.getValidCampaign();
const parsedCampaignConfig = { id: stubs.getContentfulId() };

const config = require('../../../config/lib/helpers/campaign');

// Module to test
const campaignHelper = require('../../../lib/helpers/campaign');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.beforeEach(() => {
  stubs.stubLogger(sandbox, logger);
});

test.afterEach(() => {
  sandbox.restore();
});

// fetchById
test('fetchById calls phoenix.fetchCampaignById, parseCampaign, and sets cache', async () => {
  sandbox.stub(gateway, 'fetchCampaignById')
    .returns(Promise.resolve({ data: rogueCampaign }));
  sandbox.stub(campaignHelper, 'parseCampaign')
    .returns(campaign);
  sandbox.stub(helpers.cache.campaigns, 'set')
    .returns(Promise.resolve(campaign));

  const result = await campaignHelper.fetchById(campaignId);
  gateway.fetchCampaignById.should.have.been.calledWith(campaignId);
  campaignHelper.parseCampaign.should.have.been.calledWith(rogueCampaign);
  helpers.cache.campaigns.set.should.have.been.calledWith(campaignId, campaign);
  result.should.deep.equal(campaign);
});

// fetchCampaignConfigByCampaignId
test('fetchCampaignConfigByCampaignId calls contentful.fetchEntries, parseCampaignConfig, and sets cache', async () => {
  sandbox.stub(contentful, 'fetchEntries')
    .returns(Promise.resolve({ data: [campaignConfigEntry] }));
  sandbox.stub(campaignHelper, 'parseCampaignConfig')
    .returns(parsedCampaignConfig);
  sandbox.stub(helpers.cache.campaignConfigs, 'set')
    .returns(Promise.resolve(parsedCampaignConfig));

  const result = await campaignHelper.fetchCampaignConfigByCampaignId(campaignId);
  contentful.fetchEntries.should.have.been.called;
  campaignHelper.parseCampaignConfig.should.have.been.calledWith(campaignConfigEntry);
  helpers.cache.campaignConfigs.set.should.have.been.calledWith(campaignId, parsedCampaignConfig);
  result.should.deep.equal(parsedCampaignConfig);
});

// getById
test('getById returns campaigns cache if set', async () => {
  sandbox.stub(helpers.cache.campaigns, 'get')
    .returns(Promise.resolve(campaign));
  sandbox.stub(campaignHelper, 'fetchById')
    .returns(Promise.resolve(campaign));

  const result = await campaignHelper.getById(campaignId);
  helpers.cache.campaigns.get.should.have.been.calledWith(campaignId);
  campaignHelper.fetchById.should.not.have.been.called;
  result.should.deep.equal(campaign);
});

test('getById returns fetchById if cache not set', async () => {
  sandbox.stub(helpers.cache.campaigns, 'get')
    .returns(Promise.resolve(null));
  sandbox.stub(campaignHelper, 'fetchById')
    .returns(Promise.resolve(campaign));

  const result = await campaignHelper.getById(campaignId);
  helpers.cache.campaigns.get.should.have.been.calledWith(campaignId);
  campaignHelper.fetchById.should.have.been.calledWith(campaignId);
  result.should.deep.equal(campaign);
});

test('getById returns fetchById if called with a false resetCache arg', async () => {
  sandbox.stub(helpers.cache.campaigns, 'get')
    .returns(Promise.resolve(null));
  sandbox.stub(campaignHelper, 'fetchById')
    .returns(Promise.resolve(campaign));

  const result = await campaignHelper.getById(campaignId, false);
  helpers.cache.campaigns.get.should.have.been.calledWith(campaignId);
  campaignHelper.fetchById.should.have.been.calledWith(campaignId);
  result.should.deep.equal(campaign);
});

// getCampaignConfigByCampaignId
test('getCampaignConfigByCampaignId returns campaignConfigs cache if set', async () => {
  sandbox.stub(helpers.cache.campaignConfigs, 'get')
    .returns(Promise.resolve(parsedCampaignConfig));
  sandbox.stub(campaignHelper, 'fetchCampaignConfigByCampaignId')
    .returns(Promise.resolve(parsedCampaignConfig));

  const result = await campaignHelper.getCampaignConfigByCampaignId(campaignId);
  helpers.cache.campaignConfigs.get.should.have.been.calledWith(campaignId);
  campaignHelper.fetchCampaignConfigByCampaignId.should.not.have.been.called;
  result.should.deep.equal(parsedCampaignConfig);
});

test('getCampaignConfigByCampaignId returns fetchCampaignConfigByCampaignId if cache not set', async () => {
  sandbox.stub(helpers.cache.campaignConfigs, 'get')
    .returns(Promise.resolve(null));
  sandbox.stub(campaignHelper, 'fetchCampaignConfigByCampaignId')
    .returns(Promise.resolve(parsedCampaignConfig));

  const result = await campaignHelper.getCampaignConfigByCampaignId(campaignId);
  helpers.cache.campaignConfigs.get.should.have.been.calledWith(campaignId);
  campaignHelper.fetchCampaignConfigByCampaignId.should.have.been.calledWith(campaignId);
  result.should.deep.equal(parsedCampaignConfig);
});

test('getCampaignConfigByCampaignId returns fetchCampaignConfigByCampaignId if called with a false resetCache arg', async () => {
  sandbox.stub(helpers.cache.campaignConfigs, 'get')
    .returns(Promise.resolve(null));
  sandbox.stub(campaignHelper, 'fetchCampaignConfigByCampaignId')
    .returns(Promise.resolve(parsedCampaignConfig));

  const result = await campaignHelper.getCampaignConfigByCampaignId(campaignId, false);
  helpers.cache.campaignConfigs.get.should.have.been.calledWith(campaignId);
  campaignHelper.fetchCampaignConfigByCampaignId.should.have.been.calledWith(campaignId);
  result.should.deep.equal(parsedCampaignConfig);
});

// parseCampaign
test('parseCampaign returns an object with parsed properties from a Rogue campaign', (t) => {
  const mockStatus = 'active';
  sandbox.stub(campaignHelper, 'parseCampaignStatus')
    .returns(mockStatus);

  const result = campaignHelper.parseCampaign(rogueCampaign);
  result.id.should.equal(rogueCampaign.id);
  result.title.should.equal(rogueCampaign.internal_title);
  result.internalTitle.should.equal(rogueCampaign.internal_title);
  result.status.should.equal(mockStatus);
  result.startDate.should.equal(rogueCampaign.start_date);
  // TODO: Test for campaign with endDate.date
  t.is(result.endDate, null);
});

// parseCampaignConfig
test('parseCampaignConfig should return empty object if contentfulEntry undefined', async () => {
  const result = await campaignHelper.parseCampaignConfig();
  result.should.deep.equal({});
});

test('parseCampaignConfig should return templates object with webSignup if contentfulEntry webSignup field is set', async () => {
  const stubTemplate = { text: stubs.getRandomMessageText() };
  sandbox.stub(helpers.contentfulEntry, 'getMessageTemplate')
    .returns(Promise.resolve(stubTemplate));
  const result = await campaignHelper.parseCampaignConfig(campaignConfigEntry);
  result.id.should.equal(campaignConfigEntry.sys.id);
  result.templates.webSignup.should.deep.equal(stubTemplate);
});

test('parseCampaignStatus should return active status if Rogue campaign has no end_date', () => {
  const result = campaignHelper.parseCampaignStatus(rogueCampaign);
  result.should.equal(config.statuses.active);
});

test('parseCampaignStatus should return closed status if Rogue campaign end_date has past', () => {
  const closedRogueCampaign = rogueCampaignFactory.getValidClosedCampaign();
  const result = campaignHelper.parseCampaignStatus(closedRogueCampaign);
  result.should.equal(config.statuses.closed);
});
