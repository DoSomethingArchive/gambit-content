'use strict';

// env variables
require('dotenv').config();

// Libraries
const test = require('ava');
const chai = require('chai');
const logger = require('winston');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const underscore = require('underscore');
const dateFns = require('date-fns');

const helpers = require('../../../lib/helpers');
const contentfulEntryHelper = require('../../../lib/helpers/contentfulEntry');
const phoenix = require('../../../lib/phoenix');
const stubs = require('../../utils/stubs');

const campaign = stubs.phoenix.getCampaign().data;
const campaignId = campaign.id;

// Config
const config = require('../../../config/lib/helpers/campaign');
const phoenixConfig = require('../../../config/lib/phoenix');

// Module to test
const campaignHelper = require('../../../lib/helpers/campaign');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.beforeEach(() => {
  stubs.stubLogger(sandbox, logger);
  sandbox.stub(dateFns, 'parse')
    .returns(underscore.noop);
});

test.afterEach(() => {
  sandbox.restore();
});

// fetchById
test('fetchById calls phoenix.fetchCampaignById and parseCampaign', async () => {
  sandbox.stub(phoenix, 'fetchCampaignById')
    .returns(Promise.resolve(stubs.phoenix.getCampaign()));
  sandbox.stub(campaignHelper, 'parseCampaign')
    .returns(campaign);
  const stubCampaignConfig = { id: stubs.getContentfulId() };
  sandbox.stub(contentfulEntryHelper, 'fetchCampaignConfigByCampaignId')
    .returns(Promise.resolve(stubCampaignConfig));

  const result = await campaignHelper.fetchById(campaignId);
  phoenix.fetchCampaignById.should.have.been.calledWith(campaignId);
  campaignHelper.parseCampaign.should.have.been.calledWith(campaign);
  result.should.deep.equal(Object.assign(campaign, { config: stubCampaignConfig }));
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

test('getById returns fetchById and sets cache if cache not set', async () => {
  sandbox.stub(helpers.cache.campaigns, 'get')
    .returns(Promise.resolve(null));
  sandbox.stub(campaignHelper, 'fetchById')
    .returns(Promise.resolve(campaign));
  sandbox.stub(helpers.cache.campaigns, 'set')
    .returns(Promise.resolve(campaign));

  const result = await campaignHelper.getById(campaignId);
  helpers.cache.campaigns.get.should.have.been.calledWith(campaignId);
  campaignHelper.fetchById.should.have.been.calledWith(campaignId);
  helpers.cache.campaigns.set.should.have.been.calledWith(`${campaignId}`, campaign);
  result.should.deep.equal(campaign);
});

// isClosed
test('isClosed validations', () => {
  // If status property exists, check against config.statuses
  campaignHelper.isClosed({ status: config.statuses.closed }).should.equal(true);
  campaignHelper.isClosed({ status: config.statuses.active }).should.equal(false);
  // If status and endDate undefined, isClosed
  campaignHelper.isClosed({}).should.equal(false);
});

// hasEnded
test('hasEnded returns false if campaign.endDate not isPast', () => {
  sandbox.stub(dateFns, 'isPast')
    .returns(false);
  campaignHelper.hasEnded(campaign).should.equal(false);
});

test('hasEnded returns true if campaign.endDate isPast', () => {
  sandbox.stub(dateFns, 'isPast')
    .returns(true);
  campaignHelper.hasEnded(campaign).should.equal(true);
});

// parseStatus
test('parseStatus returns active status value if campaign not isClosed', () => {
  sandbox.stub(campaignHelper, 'isClosed')
    .returns(false);
  campaignHelper.parseStatus(campaign).should.equal(config.statuses.active);
});

test('parseStatus returns closed status value if campaign isClosed', () => {
  sandbox.stub(campaignHelper, 'isClosed')
    .returns(true);
  campaignHelper.parseStatus(campaign).should.equal(config.statuses.closed);
});

// parseCampaign
test('parseCampaign validations', (t) => {
  const mockStatus = 'active';
  sandbox.stub(campaignHelper, 'parseStatus')
    .returns(mockStatus);
  sandbox.stub(campaignHelper, 'parseAshesCampaign')
    .returns(underscore.noop);
  sandbox.stub(phoenixConfig, 'useAshes')
    .returns(false);

  const result = campaignHelper.parseCampaign(campaign);
  campaignHelper.parseAshesCampaign.should.not.have.been.called;
  result.id.should.equal(Number(campaign.legacyCampaignId));
  result.title.should.equal(campaign.title);
  result.tagline.should.equal(campaign.tagline);
  campaignHelper.parseStatus.should.have.been.called;
  result.status.should.equal(mockStatus);
  t.deepEqual(result.endDate, campaign.endDate);
  result.currentCampaignRun.id.should.equal(Number(campaign.legacyCampaignRunId));
});

test('parseCampaign should return parseAshesCampaign if phoenixConfig.useAshes', () => {
  const mockResult = { id: stubs.getCampaignId() };
  sandbox.stub(campaignHelper, 'parseStatus')
    .returns(underscore.noop);
  sandbox.stub(campaignHelper, 'parseAshesCampaign')
    .returns(mockResult);
  sandbox.stub(phoenixConfig, 'useAshes')
    .returns(true);

  const result = campaignHelper.parseCampaign(campaign);
  campaignHelper.parseAshesCampaign.should.have.been.called;
  campaignHelper.parseStatus.should.not.have.been.called;
  result.should.equal(mockResult);
});

// parseAshesCampaign
test('parseAshesCampaign returns an object with parsed properties from arg', () => {
  const ashesCampaign = stubs.phoenix.getAshesCampaign().data;
  const languageCode = ashesCampaign.language.language_code;
  const result = campaignHelper.parseAshesCampaign(ashesCampaign);
  result.id.should.equal(Number(ashesCampaign.id));
  result.title.should.equal(ashesCampaign.title);
  result.tagline.should.equal(ashesCampaign.tagline);
  result.status.should.equal(ashesCampaign.status);
  const runId = Number(ashesCampaign.campaign_runs.current[languageCode].id);
  result.currentCampaignRun.id.should.equal(runId);
});
