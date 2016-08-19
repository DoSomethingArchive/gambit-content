var express = require('express')
var router = express.Router();

var logger = rootRequire('app/lib/logger');
var donationsRouter = require('./lib/donations');
var dsCampaignRouter = require('./lib/ds-routing');
var reportback = require('./lib/reportback');
var slothbot = require('./lib/slothbot');

app.use('/', router);

router.get('/', function (req, res) {
  res.send('hi');
});

// Custom DS routing to Mobile Commons paths for campaigns.
router.use('/ds-routing', dsCampaignRouter);

// Standard Staff Pick campaign report back.
router.use('/reportback', reportback);

// @todo: Move me
router.use(function(req, res, next) {
  if (req.headers['x-gambit-api-key'] !== process.env.GAMBIT_API_KEY) {
    logger.warn('missing api key request:', req.url);
    return res.sendStatus(403);
  }
  next();
});

// Internal module for handling SMS donations.
router.use('/donations', donationsRouter);

// Season 2.
router.use('/slothbot', slothbot);
