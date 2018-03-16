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
  campaignHelper.isClosed({}).should.equal(true);
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

