'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const request = require('supertest');
const mongoose = require('mongoose');

const stubs = require('../../utils/stubs');

const chatbotRoutePath = '/v1/chatbot';

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// config
require('../../../config');

// app
const app = require('../../../app');

test.after.always(() => {
  mongoose.connection.db.dropDatabase();
});

test('Should fail if request does not include a valid api key', async () => {
  await request(app)
    .post(chatbotRoutePath)
    .then((response) => {
      response.status.should.be.equal(403);
    });
});

test('Should fail if request doesn\'t include all required params', async () => {
  await request(app)
    .post(chatbotRoutePath)
    .set('x-gambit-api-key', stubs.getAPIKey())
    .then((response) => {
      response.status.should.be.equal(422);
    });
});

test('Should fail when no incomming message is detected', async () => {
  await request(app)
    .post(chatbotRoutePath)
    .set('x-gambit-api-key', stubs.getAPIKey())
    .send({ phone: stubs.getPhoneNumber() })
    .then((response) => {
      response.status.should.be.equal(422);
    });
});

// If user is not found respond with an error
