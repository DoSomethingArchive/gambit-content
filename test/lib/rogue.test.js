'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const rewire = require('rewire');
const Promise = require('bluebird');

const stubs = require('../../test/utils/stubs');
const signupFactory = require('../../test/utils/factories/signup');

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

test('rogue.fetchSignups() should call rogueClient.Signups.index()', async () => {
  const client = rogue.getClient();
  const query = { northstar_id: stubs.getUserId() };
  const signup = signupFactory.getValidSignup();
  sandbox.stub(client.Signups, 'index')
    .returns(Promise.resolve([signup]));

  const result = await rogue.fetchSignups(query);
  client.Signups.index.should.have.been.calledWith(query);
  result.should.deep.equal([signup]);
});
