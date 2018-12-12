'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const rewire = require('rewire');

chai.should();
chai.use(sinonChai);
const sandbox = sinon.sandbox.create();

// app modules
const stubs = require('../../test/utils/stubs');
const rogueCampaignFactory = require('../../test/utils/factories/rogue/campaign');

// Module to test
const gateway = rewire('../../lib/gateway');

test.beforeEach(() => {
});

test.afterEach(() => {
  sandbox.restore();
  gateway.__set__('gatewayClient', undefined);
});

test('gateway.getClient() should return the same instance', () => {
  const client = gateway.getClient();
  const newClient = gateway.getClient();
  client.should.be.equal(newClient);
});

test('gateway.fetchCampaignById() should GatewayClient.Rogue.Campaigns.get', async () => {
  const client = gateway.getClient();
  const campaign = rogueCampaignFactory.getValidCampaign();
  sandbox.stub(client.Rogue.Campaigns, 'get')
    .returns(Promise.resolve(campaign));
  const campaignId = stubs.getCampaignId();

  const result = await gateway.fetchCampaignById(campaignId);
  client.Rogue.Campaigns.get.should.have.been.calledWith(campaignId);
  result.should.be.deep.equal(campaign);
});
