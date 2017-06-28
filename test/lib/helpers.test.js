'use strict';

// env variables
require('dotenv').config();

// Libraries
const Promise = require('bluebird');
const test = require('ava');
const chai = require('chai');
const expect = require('chai').expect;
const crypto = require('crypto');
const newrelic = require('newrelic');
const logger = require('winston');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const sinon = require('sinon');

// App Modules
const stubs = require('../../test/utils/stubs');
const contentful = require('../../lib/contentful.js');
const stathat = require('../../lib/stathat');
const userFactory = require('../utils/factories/user');

// Module to test
const helpers = require('../../lib/helpers');

// Stub functions
const fetchKeywordStub = Promise.resolve(stubs.getJSONstub('fetchKeyword'));
const fetchKeywordStubEmpty = Promise.resolve('');
const fetchKeywordStubFail = Promise.reject(false);
const fetchBroadcastStub = Promise.resolve(stubs.getJSONstub('fetchBroadcast'));
const fetchBroadcastStubEmpty = Promise.resolve('');
const fetchBroadcastStubFail = Promise.reject(false);
const fetchKeywordsForCampaignIdStub = () => Promise.resolve(stubs.contentful.getKeywords());
const fetchKeywordsForCampaignIdStubFail = () => Promise.reject({ status: 500 });
const cryptoCreateHmacStub = {
  update() { return this; },
  digest() { return this; },
  substring() { return this; },
};

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

// handlePhoenixPostError
test('handlePhoenixPostError should send error response', (t) => {
  // setup
  const error = { status: 500, message: 'error' };

  // test
  helpers.handlePhoenixPostError(t.context.req, t.context.res, error);
  helpers.sendErrorResponse.should.have.been.calledWith(t.context.res, error);
});

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
  const keywords = stubs.contentful.getKeywords();
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

// sendTimeoutResponse
test('sendTimeoutResponse', (t) => {
  sandbox.spy(t.context.res, 'status');
  helpers.sendTimeoutResponse(t.context.res);
  helpers.sendResponse.should.have.been.called;
  t.context.res.status.should.have.been.calledWith(504);
});

test('getCampaignIdFromUser should return user\'s current_campaign', (t) => {
  // setup
  const user = userFactory.getValidUser();
  t.context.req.user = user;

  // test
  const campaignId = helpers.getCampaignIdFromUser(t.context.req, t.context.res);
  campaignId.should.be.equal(user.current_campaign);
});

test('getCampaignIdFromUser should send a 500 error response if user has no current_campaign', (t) => {
  // setup
  const user = userFactory.getValidUser();
  user.current_campaign = undefined;
  t.context.req.user = user;

  // test
  helpers.getCampaignIdFromUser(t.context.req, t.context.res);
  helpers.sendResponse.should.have.been.calledWith(t.context.res, 500);
});

// getKeyword
test('getKeyword should return a promise that will resolve in a keyword when found', async (t) => {
  // setup
  sandbox.stub(contentful, 'fetchKeyword').returns(fetchKeywordStub);
  sandbox.spy(helpers, 'sendUnproccessibleEntityResponse');
  t.context.req.app = {
    get: sinon.stub().returns('thor'),
  };

  // test
  const keyword = await helpers.getKeyword(t.context.req, t.context.res);
  helpers.sendResponse.should.not.have.been.called;
  helpers.sendUnproccessibleEntityResponse.should.not.have.been.called;
  keyword.should.not.be.empty;
});

test('getKeyword should send a 404 response when no broadcast is found', async (t) => {
  // setup
  sandbox.stub(contentful, 'fetchKeyword').returns(fetchKeywordStubEmpty);
  t.context.req.app = {
    get: sinon.stub().returns('thor'),
  };

  // test
  await helpers.getKeyword(t.context.req, t.context.res);
  helpers.sendResponse.should.have.been.calledWith(t.context.res, 404);
});


test('getKeyword should send Error response when it fails retrieving a broadcast', async (t) => {
  // setup
  sandbox.stub(contentful, 'fetchKeyword').returns(fetchKeywordStubFail);

  // test
  await helpers.getKeyword(t.context.req, t.context.res);
  helpers.sendErrorResponse.should.have.been.called;
});

test('getKeyword should send an unprocessable entity error response when environments don\'t match for keyword', async (t) => {
  // setup

  // The fetchKeywordStub response is a thor environment keyword
  sandbox.stub(contentful, 'fetchKeyword').returns(fetchKeywordStub);
  sandbox.spy(helpers, 'sendUnproccessibleEntityResponse');
  t.context.req.app = {
    get: sinon.stub().returns('test'),
  };

  // test
  await helpers.getKeyword(t.context.req, t.context.res);
  helpers.sendUnproccessibleEntityResponse.should.have.been.called;
});

// getBroadcast
test('getBroadcast should return a promise that will resolve in a broadcast when found', async (t) => {
  // setup
  sandbox.stub(contentful, 'fetchBroadcast').returns(fetchBroadcastStub);

  // test
  const broadcast = await helpers.getBroadcast(t.context.req, t.context.res);
  helpers.sendResponse.should.not.have.been.called;
  broadcast.should.not.be.empty;
});

test('getBroadcast should send a 404 response when no broadcast is found', async (t) => {
  // setup
  sandbox.stub(contentful, 'fetchBroadcast').returns(fetchBroadcastStubEmpty);

  // test
  await helpers.getBroadcast(t.context.req, t.context.res);
  helpers.sendResponse.should.have.been.calledWith(t.context.res, 404);
});


test('getBroadcast should send Error response when it fails retrieving a broadcast', async (t) => {
  // setup
  sandbox.stub(contentful, 'fetchBroadcast').returns(fetchBroadcastStubFail);

  // test
  await helpers.getBroadcast(t.context.req, t.context.res);
  helpers.sendErrorResponse.should.have.been.called;
});

// trackUserMessageInDashbot
test('trackUserMessageInDashbot should post dashbot incoming by default', (t) => {
  // setup
  const user = userFactory.getValidUser();
  sandbox.stub(user, 'postDashbotIncoming');
  sandbox.stub(user, 'postDashbotOutgoing');
  t.context.req.user = user;

  // test
  helpers.trackUserMessageInDashbot(t.context.req);
  user.postDashbotIncoming.should.have.been.called;
});

test('trackUserMessageInDashbot should post dashbot outgoing if there is a broadcast_id set in the request', (t) => {
  // setup
  t.context.req.broadcast_id = stubs.getBroadcastId();
  const user = userFactory.getValidUser();
  sandbox.stub(user, 'postDashbotIncoming');
  sandbox.stub(user, 'postDashbotOutgoing');
  t.context.req.user = user;

  // test
  helpers.trackUserMessageInDashbot(t.context.req);
  user.postDashbotOutgoing.should.have.been.called;
});

test('trackUserMessageInDashbot should not track request if its a retry request', (t) => {
  // setup
  t.context.req.retryCount = 1;
  const user = userFactory.getValidUser();
  sandbox.stub(user, 'postDashbotIncoming');
  sandbox.stub(user, 'postDashbotOutgoing');
  t.context.req.user = user;

  // test
  helpers.trackUserMessageInDashbot(t.context.req);
  user.postDashbotOutgoing.should.not.have.been.called;
  user.postDashbotIncoming.should.not.have.been.called;
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

// getFirstWord
test('getFirstWord should return null if no message is passed', () => {
  const result = helpers.getFirstWord(undefined);
  expect(result).to.be.null;
});

// isYesResponse
test('isYesResponse', () => {
  const validResponses = stubs.helpers.getValidYesResponses();
  const invalidResponses = stubs.helpers.getInvalidYesResponses();

  validResponses.forEach((response) => {
    helpers.isYesResponse(response).should.be.true;
  });

  invalidResponses.forEach((response) => {
    helpers.isYesResponse(response).should.be.false;
  });
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
