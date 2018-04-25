'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const httpMocks = require('node-mocks-http');

const helpers = require('../../../lib/helpers');
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

// isExternalPost
test('isExternalPost returns whether req.postType is external', (t) => {
  t.context.req.postType = 'external';
  t.truthy(requestHelper.isExternalPost(t.context.req));
  t.context.req.postType = 'photo';
  t.falsy(requestHelper.isExternalPost(t.context.req));
});

// isKeyword
test('isKeyword returns whether req.keyword is set', (t) => {
  t.context.req.keyword = stubs.getKeyword();
  t.truthy(requestHelper.isKeyword(t.context.req));
  t.context.req.keyword = null;
  t.falsy(requestHelper.isKeyword(t.context.req));
});

// isTextPost
test('isTextPost returns whether req.postType is text', (t) => {
  t.context.req.postType = 'text';
  t.truthy(requestHelper.isTextPost(t.context.req));
  t.context.req.postType = 'photo';
  t.falsy(requestHelper.isTextPost(t.context.req));
});

// isValidReportbackText
test('isValidReportbackText returns true if incoming_message is valid text', (t) => {
  t.context.req.incoming_message = 'text';
  sandbox.stub(helpers.reportback, 'isValidText')
    .returns(true);
  t.truthy(requestHelper.isValidReportbackText(t.context.req));
});

test('isValidReportbackText returns false is incoming_message is not valid text', (t) => {
  t.context.req.incoming_message = 'text';
  sandbox.stub(helpers.reportback, 'isValidText')
    .returns(false);
  t.falsy(requestHelper.isValidReportbackText(t.context.req));
});

// hasDraftSubmission
test('hasDraftSubmission returns whether the signup total quantity submitted exists', (t) => {
  t.context.req.draftSubmission = stubs.getDraft();
  t.truthy(requestHelper.hasDraftSubmission(t.context.req));
  t.context.req.draftSubmission = null;
  t.falsy(requestHelper.hasDraftSubmission(t.context.req));
});

// hasDraftWithCaption
test('hasDraftWithCaption returns whether the draft has a caption set', (t) => {
  t.context.req.draftSubmission = stubs.getDraft();
  t.truthy(requestHelper.hasDraftWithCaption(t.context.req));
  t.context.req.draftSubmission = {};
  t.falsy(requestHelper.hasDraftWithCaption(t.context.req));
});

// hasSubmittedPhotoPost
test('hasSubmittedPhotoPost returns whether the signup total quantity submitted exists', (t) => {
  t.context.req.signup = stubs.getSignupWithTotalQuantitySubmitted();
  t.truthy(requestHelper.hasSubmittedPhotoPost(t.context.req));
  t.context.req.signup = stubs.getSignupWithDraft();
  t.falsy(requestHelper.hasSubmittedPhotoPost(t.context.req));
});

// setDraftSubmission
test('setDraftSubmission should inject a draftSubmission property to req', (t) => {
  const draftSubmission = stubs.getDraft();
  requestHelper.setDraftSubmission(t.context.req, draftSubmission);
  t.context.req.draftSubmission.should.deep.equal(draftSubmission);
});

// setSignup
test('setSignup should inject a signup property to req', (t) => {
  const signup = stubs.getSignupWithTotalQuantitySubmitted();
  requestHelper.setSignup(t.context.req, signup);
  t.context.req.signup.should.deep.equal(signup);
});
