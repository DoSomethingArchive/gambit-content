'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const logger = require('winston');

app.use('/', router);

router.get('/', (req, res) => {
  app.locals.stathat('route: /');

  return res.send('hi');
});

/**
 * Authentication.
 */
router.use((req, res, next) => {
  const apiKey = process.env.GAMBIT_API_KEY;
  if (req.method === 'POST' && req.headers['x-gambit-api-key'] !== apiKey) {
    app.locals.stathat('error: invalid x-gambit-api-key');
    logger.warn('router invalid x-gambit-api-key:', req.url);

    return res.sendStatus(403);
  }
  return next();
});

router.use('/v1/status', (req, res) => res.send('ok'));

router.use('/v1/campaigns', require('./campaigns'));
router.use('/v1/chatbot', require('./chatbot'));
router.use('/v1/donorschoosebot', require('./donorschoosebot'));
router.use('/v1/signups', require('./signups'));
