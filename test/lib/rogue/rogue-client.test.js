'use strict';

require('dotenv').config();

// Libraries
const test = require('ava');
const chai = require('chai');

chai.should();
const expect = chai.expect;

// Module to test
const RogueClient = require('../../../lib/rogue/rogue-client');
const ClientCredentialsStrategy = require('../../../lib/rogue/strategies/client-credentials');

test('RogueService should throw if no strategy is passed', () => {
  expect(() => RogueClient.getInstance()).to.throw();
});

test('RogueService should not throw if strategy is passed', () => {
  const oauthStrategy = ClientCredentialsStrategy.getInstance();
  expect(() => RogueClient.getInstance({}, oauthStrategy)).not.to.throw();
});
