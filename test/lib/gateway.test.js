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
