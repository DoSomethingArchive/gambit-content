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
