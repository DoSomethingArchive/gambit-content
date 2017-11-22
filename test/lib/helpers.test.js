'use strict';

// env variables
require('dotenv').config();

// Libraries
const Promise = require('bluebird');
const test = require('ava');
const chai = require('chai');
const expect = require('chai').expect;
const newrelic = require('newrelic');
const logger = require('winston');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const sinon = require('sinon');

// App Modules
const stubs = require('../../test/utils/stubs');
const contentful = require('../../lib/contentful.js');
const stathat = require('../../lib/stathat');

// Module to test
const helpers = require('../../lib/helpers');

// Stub functions
const fetchKeywordsForCampaignIdStub = () => Promise.resolve(stubs.contentful.getKeywords());
const fetchKeywordsForCampaignIdStubFail = () => Promise.reject({ status: 500 });

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

// Setup!
test.beforeEach((t) => {
  stubs.stubLogger(sandbox, logger);
  sandbox.stub(contentful, 'fetchKeywordsForCampaignId')
    .callsFake(fetchKeywordsForCampaignIdStub)
    .withArgs('fail')
    .callsFake(fetchKeywordsForCampaignIdStubFail)
    .withArgs('empty')
    .returns(Promise.resolve([]));
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
  renderedMessage.should.have.string(phoenixCampaign.facts.problem);
  // invalid sign up command
  const invalidSignedupCmdMsg = stubs.getDefaultContenfulCampaignMessage('invalidSignupMenuCommand');
  renderedMessage = await helpers
  .replacePhoenixCampaignVars(invalidSignedupCmdMsg, phoenixCampaign);
  renderedMessage.should.have.string('Sorry, I didn\'t understand that.');

  // TODO: test more messages!
});

test('findAndReplaceKeywordVarForCampaignId a message that makes a contentful request to get keywords', async () => {
  const keywords = stubs.contentful.getKeywords();
  let renderedMessage = '';
  const phoenixCampaign = stubs.getPhoenixCampaign();
  const relativeToSignUpMsg = stubs.getDefaultContenfulCampaignMessage('scheduled_relative_to_signup_date');
  renderedMessage = await helpers
    .findAndReplaceKeywordVarForCampaignId(relativeToSignUpMsg, phoenixCampaign.id);

  contentful.fetchKeywordsForCampaignId.should.have.been.called;
  renderedMessage.should.have.string(keywords[0]);
});

test('findAndReplaceKeywordVarForCampaignId failure to retrieve keywords should throw', async (t) => {
  // will trigger fetchKeywordsForCampaignIdStubFail stub
  const campaignId = 'fail';
  const memberSupportMsg = stubs.getDefaultContenfulCampaignMessage('memberSupport');

  await t.throws(helpers.findAndReplaceKeywordVarForCampaignId(memberSupportMsg, campaignId));
  contentful.fetchKeywordsForCampaignId.should.have.been.called;
});

test('replacePhoenixCampaignVars with no message should return empty string', () => {
  const phoenixCampaign = stubs.getPhoenixCampaign();
  const renderedMessage = helpers.replacePhoenixCampaignVars(undefined, phoenixCampaign);
  renderedMessage.should.equal('');
});

test('replacePhoenixCampaignVars on a campaign object missing reportbackInfo should throw', (t) => {
  const phoenixCampaign = stubs.getPhoenixCampaign();
  delete phoenixCampaign.reportbackInfo;
  const text = stubs.getDefaultContenfulCampaignMessage('gambitSignupMenu');
  t.throws(() => helpers.replacePhoenixCampaignVars(text, phoenixCampaign));
});

// sendTimeoutResponse
test('sendTimeoutResponse', (t) => {
  sandbox.spy(t.context.res, 'status');
  helpers.sendTimeoutResponse(t.context.res);
  helpers.sendResponse.should.have.been.called;
  t.context.res.status.should.have.been.calledWith(504);
});

// getFirstWord
test('getFirstWord should return null if no message is passed', () => {
  const result = helpers.getFirstWord(undefined);
  expect(result).to.be.null;
});

// isValidReportbackQuantity
test('isValidReportbackQuantity', () => {
  helpers.isValidReportbackQuantity(2).should.be.true;
  helpers.isValidReportbackQuantity('2').should.be.true;
  helpers.isValidReportbackQuantity('2 ').should.be.true;
  helpers.isValidReportbackQuantity('a2').should.be.NaN;
});

// isValidReportbackText
test('isValidReportbackText', () => {
  helpers.isValidReportbackText('i am valid').should.be.true;
  helpers.isValidReportbackText('no').should.be.false;
  helpers.isValidReportbackText('123').should.be.false;
  helpers.isValidReportbackText('hi     ').should.be.false;
  helpers.isValidReportbackText('').should.be.false;
});

// isCommand
test('isCommand should return true when incoming message and command are valid Gambit commands', () => {
  const commandsObject = stubs.helpers.getValidCommandValues();
  const commands = Object.keys(commandsObject);

  commands.forEach((command) => {
    helpers.isCommand(commandsObject[command], command).should.be.true;
  });
});

test('isCommand should return false when missing incomingMessage argument', () => {
  helpers.isCommand(undefined, 'member_support').should.be.false;
  helpers.isCommand(undefined, 'reportback').should.be.false;
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

// trimReportbackText
test('trimReportbackText', () => {
  const text = 'This is a caption';
  helpers.trimReportbackText(text).should.be.equal(text);

  const longText = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem.';
  const trimmed = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium qu...';
  helpers.trimReportbackText(longText).should.be.equal(trimmed);
});
