'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
/*
const config = require('../../config/lib/phoenix');
const baseUri = config.clientOptions.baseUri;
*/
chai.should();
chai.use(sinonChai);
const sandbox = sinon.sandbox.create();

// Module to test
const phoenix = require('../../lib/phoenix');

test('phoenix should respond to fetchCampaign', () => {
  phoenix.should.respondTo('fetchCampaign');
});

test('phoenix should respond to isClosedCampaign', () => {
  phoenix.should.respondTo('isClosedCampaign');
});

test('phoenix should call handleSuccess on successful post', async () => {
  // setup
  sandbox.spy(phoenix, 'parsePhoenixCampaign');

  // test
  await phoenix.fetchCampaign(7);
  phoenix.parsePhoenixCampaign.should.have.been.called;
});
