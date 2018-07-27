'use strict';

// libs
require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const request = require('supertest');

const stubs = require('../../utils/stubs');

const broadcastsRoutePath = '/v1/broadcasts';

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// config
require('../../../config');

// app
const app = require('../../../app');

test('get to /broadcasts should respond with status code 403', async () => {
  await request(app)
    .get(broadcastsRoutePath)
    .expect(403);
});

test('get to /broadcasts should respond with status code 200 with valid api header', async () => {
  await request(app)
    .get(broadcastsRoutePath)
    .set('x-gambit-api-key', stubs.getAPIKey())
    .expect(200);
});


test('get to /broadcasts should respond with status code 403 with invalid api header', async () => {
  await request(app)
    .get(broadcastsRoutePath)
    .set('x-gambit-api-key', stubs.getRandomWord())
    .expect(403);
});

test('get to /broadcasts should respond with status code 200 with valid api query', async () => {
  await request(app)
    .get(broadcastsRoutePath)
    .query({ apiKey: stubs.getAPIKey() })
    .expect(200);
});

test('get to /broadcasts should respond with status code 403 with invalid api query', async () => {
  await request(app)
    .get(broadcastsRoutePath)
    .query({ apiKey: stubs.getRandomWord() })
    .expect(403);
});
