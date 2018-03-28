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

// App Modules
const stubs = require('../../utils/stubs');

const campaign = stubs.phoenix.getCampaign().data;

// Config
const config = require('../../../config/lib/helpers/campaign');

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

// isClosed
test('isClosed validations', () => {
  // If status property exists, check against config.statuses
  campaignHelper.isClosed({ status: config.statuses.closed }).should.equal(true);
  campaignHelper.isClosed({ status: config.statuses.active }).should.equal(false);
  // If status and endDate undefined, isClosed
  campaignHelper.isClosed({}).should.equal(false);
});

// isEndDatePast
test('isEndDatePast returns false if campaign.endDate is not inPast', () => {
  sandbox.stub(dateFns, 'isPast')
    .returns(false);
  campaignHelper.isEndDatePast(campaign).should.equal(false);
});

test('isEndDatePast returns true if campaign.endDate is inPast', () => {
  sandbox.stub(dateFns, 'isPast')
    .returns(true);
  campaignHelper.isEndDatePast(campaign).should.equal(true);
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

test('parseCampaign should return parseAshesCampaign if useAshes arg is true', () => {
  const mockResult = { id: stubs.getCampaignId() };
  sandbox.stub(campaignHelper, 'parseStatus')
    .returns(underscore.noop);
  sandbox.stub(campaignHelper, 'parseAshesCampaign')
    .returns(mockResult);

  const result = campaignHelper.parseCampaign(campaign, true);
  campaignHelper.parseAshesCampaign.should.have.been.called;
  campaignHelper.parseStatus.should.not.have.been.called;
  result.should.equal(mockResult);
});

// parseAshesCampaign
test('parseAshesCampaign validations', () => {
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
