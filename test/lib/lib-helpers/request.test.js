'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const httpMocks = require('node-mocks-http');

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

// isTextPost
test('isTextPost returns whether req.postType is text', (t) => {
  t.context.req.postType = 'text';
  t.truthy(requestHelper.isTextPost(t.context.req));
  t.context.req.postType = 'photo';
  t.falsy(requestHelper.isTextPost(t.context.req));
});

