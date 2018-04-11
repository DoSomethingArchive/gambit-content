'use strict';

require('dotenv').config();

// Libraries
const test = require('ava');
const chai = require('chai');

chai.should();
const expect = chai.expect;

// Module to test
const rogue = require('../../../lib/rogue/rogueService');

test('RogueService should throw if no strategy is passed', () => {
  expect(() => rogue.getInstance()).to.throw();
});
