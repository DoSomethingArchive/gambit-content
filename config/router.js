'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const logger = rootRequire('lib/logger');

app.use('/', router);

router.get('/', (req, res) => res.send('hi'));

/**
 * Authentication.
 */
router.use((req, res, next) => {
  const apiKey = process.env.GAMBIT_API_KEY;
  if (req.method === 'POST' && req.headers['x-gambit-api-key'] !== apiKey) {
    logger.warn('router invalid x-gambit-api-key:', req.url);
    return res.sendStatus(403);
  }
  return next();
});

/**
 * Chatbot routes.
 */
const chatbotRouter = rootRequire('config/router-chatbot');
router.use('/v1/chatbot', chatbotRouter);

/**
 * Legacy routes.
 */
const campaignRouter = rootRequire('api/legacy/ds-routing');
const reportbackRouter = rootRequire('api/legacy/reportback');

router.use('/ds-routing', campaignRouter);
router.use('/reportback', reportbackRouter);
