'use strict';

// Libs
const express = require('express');
const logger = require('winston');

// App modules
const stathat = require('../../lib/stathat');

// Router
const router = express.Router(); // eslint-disable-line new-cap

router.get('/', (req, res) => {
  stathat.postStat('route: /');
  return res.send('hi');
});

/**
 * Authentication.
 * TODO: Take out to separate middleware
 */
router.use((req, res, next) => {
  const apiKey = process.env.GAMBIT_API_KEY;
  if (req.method === 'POST' && req.get('x-gambit-api-key') !== apiKey) {
    stathat.postStat('error: invalid x-gambit-api-key');
    logger.warn('router invalid x-gambit-api-key:', req.url);

    return res.sendStatus(403);
  }
  return next();
});

router.use('/v1/status', (req, res) => res.send('ok'));
router.use('/v1/campaigns', require('./campaigns'));
router.use('/v1/chatbot', require('./chatbot'));
router.use('/v1/signups', require('./signups'));

module.exports = function init(app) {
  app.use('/', router);
};
