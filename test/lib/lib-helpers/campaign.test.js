'use strict';

// env variables
require('dotenv').config();

// Libraries
const test = require('ava');
const chai = require('chai');
const logger = require('winston');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

// App Modules
const stubs = require('../../utils/stubs');

// Config
const config = require('../../../config/lib/helpers/campaign');

// Module to test
const campaignHelper = require('../../../lib/helpers/campaign');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

// Setup!
test.beforeEach(() => {
  stubs.stubLogger(sandbox, logger);
});

// Cleanup!
test.afterEach(() => {
  // reset stubs, spies, and mocks
  sandbox.restore();
});

/**
 * Tests
 */

// parseStatus
test('parseStatus() validations', () => {
  const closedStatus = config.statuses.closed;
  // if status property exists, it should be returned
  const randomStatus = 'winter';
  const legacyCampaign = {
    status: randomStatus,
  };
  campaignHelper.parseStatus(legacyCampaign).should.equal(randomStatus);
  // If status or endDate undefined, should be closed
  campaignHelper.parseStatus({}).should.equal(closedStatus);
});
