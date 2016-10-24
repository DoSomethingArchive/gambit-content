'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const logger = app.locals.logger;

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
 * Chatbot.
 */
const chatbotRouter = rootRequire('config/router-chatbot');
router.use('/v1/chatbot', chatbotRouter);

/**
 * Campaigns.
 */
router.get('/v1/campaigns', (req, res) => {
  const findClause = {};
  if (req.query.campaignbot) {
    const campaignConfigVar = process.env.CAMPAIGNBOT_CAMPAIGNS;
    const campaignIDs = campaignConfigVar.split(',').map(id => Number(id));
    findClause._id = { $in: campaignIDs };
  }

  return app.locals.db.campaigns
    .find(findClause)
    .exec()
    .then(campaigns => res.send({ data: campaigns }))
    .catch(error => res.send(error));
});

router.get('/v1/campaigns/:id', (req, res) => {
  logger.debug(`get campaign ${req.params.id}`);

  return app.locals.db.campaigns
    .findById(req.params.id)
    .exec()
    .then(campaign => res.send({ data: campaign }))
    .catch(error => res.send(error));
});

/**
 * Legacy.
 */
const campaignRouter = rootRequire('legacy/ds-routing');
const reportbackRouter = rootRequire('legacy/reportback');

router.use('/ds-routing', campaignRouter);
router.use('/reportback', reportbackRouter);
