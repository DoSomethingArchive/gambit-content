'use strict';

require('dotenv').config();

// Libraries
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const Promise = require('bluebird');

// Module to test
// const RogueClient = require('../../../../lib/rogue/rogue-client');
const ClientCredentials = require('../../../../lib/rogue/strategies/client-credentials');
const stubs = require('../../../utils/stubs');

chai.should();
chai.use(sinonChai);
const expect = chai.expect;
const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  t.context.requestedToken = stubs.rogueClient.getOauth2ClientToken();
  /**
   * @see http://sinonjs.org/releases/v4.5.0/fake-timers/
   */
  t.context.clock = sinon.useFakeTimers({
    now: new Date(),
  });
});

test.afterEach((t) => {
  sandbox.restore();
  t.context.clock.restore();
});

test('ClientCredentials must implement setup and getAuthorizedClient methods', () => {
  const clientCredentials = ClientCredentials.getInstance();
  clientCredentials.should.respondTo('setup');
  clientCredentials.should.respondTo('getAuthorizedClient');
});

test('ClientCredentials should set token when running setup()', async (t) => {
  const clientCredentials = ClientCredentials.getInstance({
    autoRenewToken: false,
  });
  stubs.rogueClient.spyOnClientCredentialMethods(sandbox, clientCredentials);
  sandbox.stub(clientCredentials, 'requestToken')
    .returns(Promise.resolve(t.context.requestedToken));

  await clientCredentials.setup();
  clientCredentials.renewToken.should.have.been.called;
  clientCredentials.getAccessToken.should.have.been.called;
  clientCredentials.setToken.should.have.been.called;
  clientCredentials.emit.should.have.been.calledWith('token-set');
});

test('ClientCredentials should set token and start ticker when running setup()', async (t) => {
  const clientCredentials = ClientCredentials.getInstance({
    autoRenewToken: true,
    // Fake timer wrapped setInterval
    setInterval,
  });
  stubs.rogueClient.spyOnClientCredentialMethods(sandbox, clientCredentials);
  sandbox.stub(clientCredentials, 'requestToken')
    .returns(Promise.resolve(t.context.requestedToken));

  await clientCredentials.setup();
  clientCredentials.renewToken.should.have.been.called;
  clientCredentials.getAccessToken.should.have.been.called;
  clientCredentials.setToken.should.have.been.called;
  clientCredentials.emit.should.have.been.calledWith('token-set');
  clientCredentials.setTicker.should.have.been.called;
  expect(clientCredentials.ticker).to.exist;
  // advances time for all fake timers, triggering their callbacks
  t.context.clock.tick(3000);
  clientCredentials.renewExpiredToken.should.have.been.called;
});

test('ClientCredentials should renew token if the token is about to expire', async (t) => {
  const clientCredentials = ClientCredentials.getInstance({
    autoRenewToken: true,
    // Fake timer wrapped setInterval
    setInterval,
  });
  stubs.rogueClient.spyOnClientCredentialMethods(sandbox, clientCredentials);
  sandbox.stub(clientCredentials, 'requestToken')
    .returns(Promise.resolve(t.context.requestedToken));

  await clientCredentials.setup();

  const renewWindowTrigger = clientCredentials.renewWindow - 2;
  const tickMilliseconds = (t.context.requestedToken.expires_in - renewWindowTrigger) * 1000;
  // advances time for all fake timers, triggering their callbacks
  t.context.clock.tick(tickMilliseconds);
  clientCredentials.clearTicker.should.have.been.called;
  clientCredentials.renewToken.should.have.been.called;
});

test('ClientCredentials should emit token-error on failure to request token', async (t) => {
  const clientCredentials = ClientCredentials.getInstance({
    autoRenewToken: false,
  });
  stubs.rogueClient.spyOnClientCredentialMethods(sandbox, clientCredentials);
  sandbox.stub(clientCredentials, 'requestToken')
    .returns(Promise.reject(t.context.requestedToken));
  sandbox.stub(clientCredentials, 'reconnect')
    .returns(false);

  await clientCredentials.setup();
  clientCredentials.emit.should.have.been.calledWith('token-error');
  clientCredentials.reconnect.should.have.been.called;
});
