'use strict';

require('dotenv').config();

// Libraries
const test = require('ava');
const chai = require('chai');

// Module to test
const RogueClient = require('../../../lib/rogue/rogue-client');
const ClientCredentialsStrategy = require('../../../lib/rogue/strategies/client-credentials');

chai.should();
const expect = chai.expect;

test('RogueClient should throw if no strategy is passed', () => {
  expect(() => RogueClient.getInstance()).to.throw();
});

test('RogueClient should not throw if strategy is passed', () => {
  const oauthStrategy = ClientCredentialsStrategy.getInstance();
  expect(() => RogueClient.getInstance({}, [oauthStrategy])).not.to.throw();
});

test('RogueClient should throw when requesting without an strategyName', () => {
  const oauthStrategy = ClientCredentialsStrategy.getInstance();
  const rogueClient = RogueClient.getInstance({}, [oauthStrategy]);
  expect(() => rogueClient.request('clientCredentials')).not.to.throw();
  expect(() => rogueClient.request()).to.throw();
});
