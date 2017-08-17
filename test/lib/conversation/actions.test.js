'use strict';

// env variables
require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

// Module to test
const actions = require('../../../lib/conversation/actions');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test('actions should respond to continueConversation', () => {
  actions.should.respondTo('continueConversation');
});

test('actions should respond to endConversation', () => {
  actions.should.respondTo('endConversation');
});