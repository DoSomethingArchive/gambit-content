'use strict';

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');

const config = require('../../../config/lib/helpers/command');

// Module to test
const commandHelper = require('../../../lib/helpers/command');

chai.should();
chai.use(sinonChai);

// getRequestSupportCommand
test('getRequestSupportCommand returns a string', () => {
  const result = commandHelper.getRequestSupportCommand();
  result.should.equal(config.commands.requestSupport.value);
});

test('getStartCommand returns a string', () => {
  const result = commandHelper.getStartCommand();
  result.should.equal(config.commands.start.value);
});
