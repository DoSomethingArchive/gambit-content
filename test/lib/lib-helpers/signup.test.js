'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const logger = require('winston');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const stubs = require('../../utils/stubs');

// Module to test
const signupHelper = require('../../../lib/helpers/signup');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.beforeEach(() => {
  stubs.stubLogger(sandbox, logger);
});

test.afterEach(() => {
  sandbox.restore();
});

// isValidText
test('getDefaultCreatePayloadFromReq returns an object', () => {
  const req = {
    userId: stubs.getUserId(),
    campaignId: stubs.getCampaignId(),
    campaignRunId: stubs.getCampaignRunId(),
    platform: stubs.getPlatform(),
  };
  const result = signupHelper.getDefaultCreatePayloadFromReq(req);
  result.campaign_id.should.equal(req.campaignId);
  result.campaign_run_id.should.equal(req.campaignRunId);
  result.northstar_id.should.equal(req.userId);
  result.source.should.equal(req.platform);
});

