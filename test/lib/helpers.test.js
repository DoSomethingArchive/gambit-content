'use strict';

require('dotenv').config();
const helpers = require('../../lib/helpers');
const test = require('ava');
const chai = require('chai');

// setup should assertion style
chai.should();

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

// upsertOptions
test('upsertOptions helper', () => {
  const opts = helpers.upsertOptions();
  opts.upsert.should.be.true;
  opts.new.should.be.true;
});
