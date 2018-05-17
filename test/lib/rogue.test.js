'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const rewire = require('rewire');
const Promise = require('bluebird');

const stubs = require('../../test/utils/stubs');

chai.should();
chai.use(sinonChai);
const sandbox = sinon.sandbox.create();

// Module to test
const rogue = rewire('../../lib/rogue');

test.beforeEach(() => {
});

test.afterEach(() => {
  sandbox.restore();
  rogue.__set__('rogueClient', undefined);
});

test('rogue.getClient() should return the same instance', () => {
  const client = rogue.getClient();
  const newClient = rogue.getClient();
  client.should.be.equal(newClient);
});

test('rogue.createPost() should call rogueClient.Posts.create()', () => {
  const client = rogue.getClient();
  sandbox.stub(client.Posts, 'create')
    .returns(Promise.resolve(true));

  rogue.createPost({});
  client.Posts.create.should.have.been.called;
});

test('rogue.createSignup() should call rogueClient.Signups.create()', () => {
  const client = rogue.getClient();
  sandbox.stub(client.Signups, 'create')
    .returns(Promise.resolve(true));

  rogue.createSignup({});
  client.Signups.create.should.have.been.called;
});

test('rogue.getSignupsByUserIdAndCampaignRunId() should call rogueClient.Signups.getByUserIdAndCampaignRunId()', () => {
  const client = rogue.getClient();
  sandbox.stub(client.Signups, 'getByUserIdAndCampaignRunId')
    .returns(Promise.resolve(true));

  rogue.getSignupsByUserIdAndCampaignRunId(
    stubs.getUserId(),
    stubs.getCampaignRunId());
  client.Signups.getByUserIdAndCampaignRunId.should.have.been.called;
});
