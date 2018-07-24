'use strict';

const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const httpMocks = require('node-mocks-http');

const utilHelper = require('../../../lib/helpers/util');
const stubs = require('../../utils/stubs');

// Module to test
const responseHelper = require('../../../lib/helpers/response');

chai.should();
chai.use(sinonChai);

const data = { id: stubs.getContentfulId() };

const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  t.context.res = httpMocks.createResponse();
  sandbox.spy(t.context.res, 'send');
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

// sendData
test('sendData passes object with data property to res.send', (t) => {
  responseHelper.sendData(t.context.res, data);
  t.context.res.send.should.have.been.calledWith({ data });
});

// sendIndexData
test('sendIndexData calls res.send with data arg and given meta arg if exists', (t) => {
  const meta = {
    pagination: {
      total: 240,
    },
  };
  responseHelper.sendIndexData(t.context.res, data, meta);
  t.context.res.send.should.have.been.calledWith({ data, meta });
});

// sendIndexData
test('sendIndexData calls res.send with data arg and util.getMeta if meta undefined', (t) => {
  const stubMeta = { total: data.length };
  sandbox.stub(utilHelper, 'getMeta')
    .returns(stubMeta);
  responseHelper.sendIndexData(t.context.res, data);
  utilHelper.getMeta.should.have.been.calledWith(data.length);
  t.context.res.send.should.have.been.calledWith({ data, meta: stubMeta });
});
