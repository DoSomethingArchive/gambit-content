'use strict';

// env variables
require('dotenv').config();

// Libraries
const test = require('ava');
const chai = require('chai');
const newrelic = require('newrelic');
const logger = require('winston');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const sinon = require('sinon');

// App Modules
const stubs = require('../../test/utils/stubs');
const signupFactory = require('../utils/factories/signup');
const stathat = require('../../lib/stathat');

// Module to test
const helpers = require('../../lib/helpers');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

// Setup!
test.beforeEach((t) => {
  stubs.stubLogger(sandbox, logger);
  sandbox.stub(newrelic, 'addCustomParameters');
  sandbox.stub(stathat, 'postStat');

  // setup spies
  sandbox.spy(helpers, 'sendErrorResponse');
  sandbox.spy(helpers, 'sendResponse');

  // setup req, res mocks
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

// Cleanup!
test.afterEach((t) => {
  // reset stubs, spies, and mocks
  sandbox.restore();
  t.context = {};
});

/**
 * Tests
 */

// replacePhoenixCampaignVars
test('replacePhoenixCampaignVars', async () => {
  const phoenixCampaign = stubs.getPhoenixCampaign();
  let renderedMessage = '';
  // signedup through gambit
  const signedupGambitMsg = stubs.getDefaultContenfulCampaignMessage('gambitSignupMenu');
  renderedMessage = await helpers
    .replacePhoenixCampaignVars(signedupGambitMsg, phoenixCampaign);
  renderedMessage.should.have.string(phoenixCampaign.title);
  // invalid sign up command
  const invalidSignedupCmdMsg = stubs.getDefaultContenfulCampaignMessage('invalidSignupMenuCommand');
  renderedMessage = await helpers
    .replacePhoenixCampaignVars(invalidSignedupCmdMsg, phoenixCampaign);
  renderedMessage.should.have.string('Sorry, I didn\'t understand that.');

  // TODO: test more messages!
});

test('replacePhoenixCampaignVars with no message should return empty string', () => {
  const phoenixCampaign = stubs.getPhoenixCampaign();
  const renderedMessage = helpers.replacePhoenixCampaignVars(undefined, phoenixCampaign);
  renderedMessage.should.equal('');
});

// sendResponseForSignup
test('sendResponseForSignup should call signup.formatForApi', (t) => {
  sandbox.spy(t.context.res, 'send');
  const signup = signupFactory.getValidSignup();
  sandbox.stub(signup, 'formatForApi').returns({ id: signup.id });
  t.context.req.signup = signup;

  helpers.sendResponseForSignup(t.context.res, signup);
  signup.formatForApi.should.have.been.called;
  t.context.res.send.should.have.been.called;
});

test('sendResponseForSignup should not call signup.formatForApi if signup arg undefined', (t) => {
  sandbox.spy(t.context.res, 'send');
  const signup = signupFactory.getValidSignup();
  sandbox.stub(signup, 'formatForApi').returns({ id: signup.id });
  t.context.req.signup = signup;

  helpers.sendResponseForSignup(t.context.res, null);
  signup.formatForApi.should.not.have.been.called;
  t.context.res.send.should.have.been.called;
});

// sendTimeoutResponse
test('sendTimeoutResponse', (t) => {
  sandbox.spy(t.context.res, 'status');
  helpers.sendTimeoutResponse(t.context.res);
  helpers.sendResponse.should.have.been.called;
  t.context.res.status.should.have.been.calledWith(504);
});

// handleTimeout
test('handleTimeout should send timeout response if req.timedout is true', (t) => {
  // setup
  sandbox.spy(helpers, 'sendTimeoutResponse');
  t.context.req.timedout = true;

  // test
  helpers.handleTimeout(t.context.req, t.context.res);
  helpers.sendTimeoutResponse.should.have.been.called;
});

test('handleTimeout should return false if req.timedout is false', (t) => {
  // setup
  sandbox.spy(helpers, 'sendTimeoutResponse');
  t.context.req.timedout = false;

  // test
  const timedout = helpers.handleTimeout(t.context.req, t.context.res);
  helpers.sendTimeoutResponse.should.not.have.been.called;
  timedout.should.be.false;
});

// sendErrorResponse
// TODO: Test for more error types and messages
test('sendErrorResponse', (t) => {
  helpers.sendErrorResponse(t.context.res, { /* Error Object */ });

  helpers.sendResponse.should.have.been.called;
  newrelic.addCustomParameters.should.have.been.called;
  // TODO: Use calledWithExactly when testing specific errors
  helpers.sendResponse.should.have.been.calledWith(t.context.res, 500);
});

// sendUnproccessibleEntityResponse
test('sendUnproccessibleEntityResponse', (t) => {
  const message = 'Test';
  helpers.sendUnproccessibleEntityResponse(t.context.res, message);

  helpers.sendResponse.should.have.been.called;
  helpers.sendResponse.should.have.been.calledWithExactly(t.context.res, 422, message);
});

// upsertOptions
test('upsertOptions helper', () => {
  const opts = helpers.upsertOptions();
  opts.upsert.should.be.true;
  opts.new.should.be.true;
});
