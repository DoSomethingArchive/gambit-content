'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap

app.use('/', router);

router.get('/', (req, res) => res.send('hi'));

/**
 * Authentication.
 */
router.use((req, res, next) => {
  const apiKey = process.env.GAMBIT_API_KEY;
  if (req.method === 'POST' && req.headers['x-gambit-api-key'] !== apiKey) {
    app.locals.logger.warn('router invalid x-gambit-api-key:', req.url);
    return res.sendStatus(403);
  }
  return next();
});

router.use('/v1/campaigns', require('./campaigns'));
router.use('/v1/chatbot',  require('./chatbot'));

/**
 * Legacy.
 */
const campaignRouter = rootRequire('legacy/ds-routing');
const reportbackRouter = rootRequire('legacy/reportback');

router.use('/ds-routing', campaignRouter);
router.use('/reportback', reportbackRouter);
