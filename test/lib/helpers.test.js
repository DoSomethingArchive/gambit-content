'use strict';

require('dotenv').config();
const Promise = require('bluebird');
const test = require('ava');
const chai = require('chai');
const expect = require('chai').expect;
const stubs = require('../../test/utils/stubs');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const contentful = require('../../lib/contentful.js');
const stathat = require('../../lib/stathat');
const crypto = require('crypto');
const newrelic = require('newrelic');
const logger = require('winston');

// Module to test
const helpers = require('../../lib/helpers');

// Stub functions
const fetchKeywordsForCampaignIdStub = () => Promise.resolve(stubs.getKeywords());
const fetchKeywordsForCampaignIdStubFail = () => Promise.reject({ status: 500 });
const cryptoCreateHmacStub = {
  update() { return this; },
  digest() { return this; },
  substring() { return this; },
};

// setup should assertion style
chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

// Setup!
test.beforeEach((t) => {
  // setup stubs
  sandbox.stub(contentful, 'fetchKeywordsForCampaignId')
    .callsFake(fetchKeywordsForCampaignIdStub)
    .withArgs('fail')
    .callsFake(fetchKeywordsForCampaignIdStubFail)
    .withArgs('empty')
    .returns(Promise.resolve([]));
  sandbox.stub(logger, 'error');
  sandbox.stub(logger, 'debug');
  sandbox.stub(newrelic, 'addCustomParameters');
  sandbox.stub(stathat, 'postStat');
  sandbox.stub(crypto, 'createHmac').returns(cryptoCreateHmacStub);

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
  const signedupGambitMsg = stubs.getDefaultContenfulCampaignMessage('menu_signedup_gambit');
  renderedMessage = await helpers
    .replacePhoenixCampaignVars(signedupGambitMsg, phoenixCampaign);
  renderedMessage.should.have.string(phoenixCampaign.facts.problem);
  // invalid sign up command
  const invalidSignedupCmdMsg = stubs.getDefaultContenfulCampaignMessage('invalid_cmd_signedup');
  renderedMessage = await helpers
  .replacePhoenixCampaignVars(invalidSignedupCmdMsg, phoenixCampaign);
  renderedMessage.should.have.string('Sorry, I didn\'t understand that.');

  // TODO: test more messages!
});

test('replacePhoenixCampaignVars a message that makes a contentful request to get keywords', async () => {
  const keywords = stubs.getKeywords();
  let renderedMessage = '';
  const phoenixCampaign = stubs.getPhoenixCampaign();
  const relativeToSignUpMsg = stubs.getDefaultContenfulCampaignMessage('scheduled_relative_to_signup_date');
  renderedMessage = await helpers
    .replacePhoenixCampaignVars(relativeToSignUpMsg, phoenixCampaign);

  contentful.fetchKeywordsForCampaignId.should.have.been.called;
  renderedMessage.should.have.string(keywords[0].keyword);
});

test('replacePhoenixCampaignVars failure to retrieve keywords should throw', async (t) => {
  const phoenixCampaign = stubs.getPhoenixCampaign();
  // will trigger fetchKeywordsForCampaignIdStubFail stub
  phoenixCampaign.id = 'fail';
  const memberSupportMsg = stubs.getDefaultContenfulCampaignMessage('member_support');

  await t.throws(helpers.replacePhoenixCampaignVars(memberSupportMsg, phoenixCampaign));
  contentful.fetchKeywordsForCampaignId.should.have.been.called;
});

test('replacePhoenixCampaignVars with no message should return empty string', async () => {
  const phoenixCampaign = stubs.getPhoenixCampaign();
  const renderedMessage = await helpers
    .replacePhoenixCampaignVars(undefined, phoenixCampaign);
  renderedMessage.should.equal('');
});

test('replacePhoenixCampaignVars on a campaign object missing reportbackInfo should throw', async (t) => {
  const phoenixCampaign = stubs.getPhoenixCampaign();
  delete phoenixCampaign.reportbackInfo;
  const memberSupportMsg = stubs.getDefaultContenfulCampaignMessage('menu_signedup_gambit');
  await t.throws(helpers.replacePhoenixCampaignVars(memberSupportMsg, phoenixCampaign));
});

// addSenderPrefix
test('addSenderPrefix', () => {
  const prefix = process.env.GAMBIT_CHATBOT_RESPONSE_PREFIX;
  const text = 'taco';
  const string = `${prefix} ${text}`;
  helpers.addSenderPrefix(text).should.be.equal(string);

  process.env.GAMBIT_CHATBOT_RESPONSE_PREFIX = '';
  helpers.addSenderPrefix(text).should.be.equal(text);
});

// containsNaughtyWords
test('containsNaughtyWords', () => {
  helpers.containsNaughtyWords('suck').should.be.true;
  helpers.containsNaughtyWords('fuck you').should.be.true;
  helpers.containsNaughtyWords('hi').should.be.false;
});

// getFirstWord
test('getFirstWord should return null if no message is passed', () => {
  const result = helpers.getFirstWord(undefined);
  expect(result).to.be.null;
});

// isYesResponse
test('isYesResponse', () => {
  helpers.isYesResponse('yea').should.be.true;
  helpers.isYesResponse('si').should.be.true;
  helpers.isYesResponse('s').should.be.true;
  helpers.isYesResponse('yesss').should.be.true;
  helpers.isYesResponse('i can').should.be.true;
  helpers.isYesResponse('yes').should.be.true;
  helpers.isYesResponse('nah').should.be.false;
  helpers.isYesResponse('ss').should.be.false;
  helpers.isYesResponse('abs').should.be.false;
  helpers.isYesResponse('def').should.be.false;
  helpers.isYesResponse('hell').should.be.false;
  helpers.isYesResponse('tamales').should.be.false;
  helpers.isYesResponse('definitely not').should.be.false;
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

// generatePassword
test('generatePassword', () => {
  helpers.generatePassword('taco');
  crypto.createHmac.should.have.been.calledWithExactly('sha1', process.env.DS_API_PASSWORD_KEY);
});

// isCommand
test('isCommand should return true when incoming message is Q and type is member_support', () => {
  helpers.isCommand('q', 'member_support').should.be.true;
  helpers.isCommand('q ', 'member_support').should.be.true;
  helpers.isCommand(' q t pie', 'member_support').should.be.true;
});

test('isCommand should return true when incoming message is start and type is reportback', () => {
  helpers.isCommand('start', 'reportback').should.be.true;
  helpers.isCommand('start ', 'reportback').should.be.true;
  helpers.isCommand(' start the party!', 'reportback').should.be.true;
});

test('isCommand should return false when missing incomingMessage argument', () => {
  helpers.isCommand(undefined, 'member_support').should.be.false;
  helpers.isCommand(undefined, 'reportback').should.be.false;
});

// sendTimeoutResponse
test('sendTimeoutResponse', (t) => {
  const timeoutNumSeconds = helpers.getGambitTimeoutNumSeconds();
  helpers.sendTimeoutResponse(t.context.res);

  helpers.sendResponse.should.have.been.called;
  helpers.sendResponse.should.have.been.calledWithExactly(t.context.res, 504, `Request timed out after ${timeoutNumSeconds} seconds.`);
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

// getGambitTimeoutNumSeconds
test('getGambitTimeoutNumSeconds', () => {
  helpers.getGambitTimeoutNumSeconds().should.not.be.undefined;
  helpers.getGambitTimeoutNumSeconds().should.be.below(30);
});

// upsertOptions
test('upsertOptions helper', () => {
  const opts = helpers.upsertOptions();
  opts.upsert.should.be.true;
  opts.new.should.be.true;
});
