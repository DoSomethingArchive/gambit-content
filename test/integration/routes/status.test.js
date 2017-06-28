'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
// const sinon = require('sinon');
const sinonChai = require('sinon-chai');
// const httpMocks = require('node-mocks-http');
const request = require('supertest');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// config
require('../../../config');

// app
const app = require('../../../app');

test('get to / should respond with status code 200', async () => {
  await request(app)
    .get('/v1/status')
    .then((response) => {
      response.status.should.be.equal(200);
    });
});
