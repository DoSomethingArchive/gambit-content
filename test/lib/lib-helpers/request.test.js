'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const httpMocks = require('node-mocks-http');

const stubs = require('../../utils/stubs');

// Module to test
const requestHelper = require('../../../lib/helpers/request');

chai.should();
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  t.context.req = httpMocks.createRequest();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('isCacheReset returns false if no query params', (t) => {
  t.context.req.query = {};
  t.falsy(requestHelper.isCacheReset(t.context.req));
});

test('isCacheReset returns true if cache query param is set to false', (t) => {
  t.context.req.query = { cache: 'false' };
  t.truthy(requestHelper.isCacheReset(t.context.req));
});

test('isCacheReset returns falsy if cache query param is not set to false', (t) => {
  t.context.req.query = { cache: stubs.getRandomWord() };
  t.falsy(requestHelper.isCacheReset(t.context.req));
});
