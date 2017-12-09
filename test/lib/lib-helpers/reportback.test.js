'use strict';

// env variables
require('dotenv').config();

// Libraries
const test = require('ava');
const chai = require('chai');
const logger = require('winston');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

// App Modules
const stubs = require('../../utils/stubs');

// Config
const config = require('../../../config/lib/helpers/reportback');

// Module to test
const reportbackHelper = require('../../../lib/helpers/reportback');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

// Setup!
test.beforeEach(() => {
  stubs.stubLogger(sandbox, logger);
});

// Cleanup!
test.afterEach(() => {
  // reset stubs, spies, and mocks
  sandbox.restore();
});

/**
 * Tests
 */

// isValidQuantity
test('isValidQuantity() validations', () => {
  // non decimal number should pass
  reportbackHelper.isValidQuantity('1').should.be.true;
  reportbackHelper.isValidQuantity(' 1').should.be.true;
  reportbackHelper.isValidQuantity(' 1 ').should.be.true;
  // decimal number should not pass
  reportbackHelper.isValidQuantity('1.1').should.be.false;
  reportbackHelper.isValidQuantity(' 1.1').should.be.false;
  reportbackHelper.isValidQuantity(' 1.1 ').should.be.false;
  // any text should not pass
  reportbackHelper.isValidQuantity('a').should.be.false;
  reportbackHelper.isValidQuantity(' 1a').should.be.false;
  reportbackHelper.isValidQuantity('1,').should.be.false;
  reportbackHelper.isValidQuantity('1 hundred').should.be.false;
});

// isValidText
test('isValidText() validations', () => {
  // Text can't be empty
  reportbackHelper.isValidText('').should.be.false;
  reportbackHelper.isValidText('       ').should.be.false;
  // Text must meet length requirements
  reportbackHelper.isValidText(stubs.getRandomString(config.minTextLength + 1)).should.be.true;
  reportbackHelper.isValidText(stubs.getRandomString(config.minTextLength)).should.be.false;
});

// trimText
test('trimText() validations', () => {
  // It should trim spaces out of text
  const text1 = stubs.getRandomString();
  reportbackHelper.trimText(`   ${text1}   `).should.be.equal(text1);
  // If longer that maxTextLength it should ellipsify
  const text2 = stubs.getRandomString(config.maxTextLength + 10);
  const result2 = reportbackHelper.trimText(text2);
  result2.indexOf(config.ellipsis).should.be.equal(result2.length - config.ellipsis.length);
  // Text shouldn't be longer than 255|maxTextLength
  const text3 = stubs.getRandomString(config.maxTextLength + 100);
  const result3 = reportbackHelper.trimText(text3);
  result3.length.should.be.equal(config.maxTextLength);
});
