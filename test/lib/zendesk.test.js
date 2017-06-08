'use strict';

require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const rewire = require('rewire');

chai.should();
chai.use(sinonChai);

// const zendeskAPI = require('zendesk-node-api');

const zendesk = rewire('../../lib/zendesk');

const sandbox = sinon.sandbox.create();

// const zendeskAPIStub = {
//   tickets: () => {},
// };

// test.beforeEach(() => {
//   sandbox.stub(zendeskAPI, 'Zendesk')
//     .returns(zendeskAPIStub);
// });

// Cleanup!
test.afterEach((t) => {
  // reset stubs, spies, and mocks
  sandbox.restore();
  t.context = {};

  // reset client state on each test
  zendesk.__set__('client', undefined);
});

// createNewClient
test('createNewClient should create a new zendesk client by calling zendesk.Zendesk',
() => {
  zendesk.createNewClient();
//  zendeskAPI.Zendesk.should.have.been.called;
//  zendesk.Zendesk().should.respondTo('tickets');
});
