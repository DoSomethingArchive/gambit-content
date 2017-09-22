'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

// App Modules
const stubs = require('../../../test/utils/stubs');
const userFactory = require('../../utils/factories/user');

// Stubs
const user = userFactory.getUser();
const chatbotArgs = stubs.conversation.getChatbotRequestArgs(user);
const receiveMessageArgs = stubs.conversation.getRecieveMessageRequestArgs(user);
const signupsArgs = stubs.conversation.getSignupsRequestArgs(user);

// Module to test
const actions = require('../../../lib/conversation/actions');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.beforeEach(() => {
  sandbox.stub(user, 'postMobileCommonsProfileUpdate');
});

test.afterEach(() => {
  sandbox.restore();
});

test('actions should respond to continueConversation', () => {
  actions.should.respondTo('continueConversation');
});

test('continueConversation should postMobileCommonsProfileUpdate for chatbot requests', () => {
  actions.continueConversation(chatbotArgs);
  user.postMobileCommonsProfileUpdate.should.have.been.called;
});

test('continueConversation should postMobileCommonsProfileUpdate for receive-message requests', () => {
  actions.continueConversation(receiveMessageArgs);
  user.postMobileCommonsProfileUpdate.should.not.have.been.called;
});

test('continueConversation should postMobileCommonsProfileUpdate for signups requests', () => {
  actions.continueConversation(signupsArgs);
  user.postMobileCommonsProfileUpdate.should.have.been.called;
});

test('actions should respond to endConversation', () => {
  actions.should.respondTo('endConversation');
});

test('endConversation should postMobileCommonsProfileUpdate for chatbot requests', () => {
  actions.endConversation(chatbotArgs);
  user.postMobileCommonsProfileUpdate.should.have.been.called;
});

test('endConversation should not postMobileCommonsProfileUpdate for receive-message requests', () => {
  actions.endConversation(receiveMessageArgs);
  user.postMobileCommonsProfileUpdate.should.not.have.been.called;
});

test('endConversation should postMobileCommonsProfileUpdate for signups requests', () => {
  actions.endConversation(signupsArgs);
  user.postMobileCommonsProfileUpdate.should.have.been.called;
});
