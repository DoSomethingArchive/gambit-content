'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const nock = require('nock');

const campaignHelper = require('../../lib/helpers/campaign');
const stubs = require('../../test/utils/stubs');
const config = require('../../config/lib/phoenix');

const baseUri = config.clientOptions.baseUri;
const campaignId = stubs.getCampaignId();

chai.should();
chai.use(sinonChai);
const sandbox = sinon.sandbox.create();

// Module to test
const phoenix = require('../../lib/phoenix');

test.beforeEach(() => {
  sandbox.stub(campaignHelper, 'parseCampaign')
    .returns({ id: campaignId });
  sandbox.spy(phoenix, 'parsePhoenixError');
});

test.afterEach(() => {
  sandbox.restore();
});

test('phoenix should respond to fetchCampaignById', () => {
  phoenix.should.respondTo('fetchCampaignById');
});

test('phoenix.fetchCampaignById should call parsePhoenixError on error', async () => {
  const message = 'Miley';
  const status = 500;
  nock(baseUri)
    .get(/$/)
    .reply(status, { error: { message } });

  try {
    await phoenix.fetchCampaignById(campaignId);
  } catch (error) {
    error.status.should.be.equal(status);
  }
  phoenix.parsePhoenixError.should.have.been.called;
});
