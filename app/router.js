var express = require('express')
var router = express.Router();

var logger = rootRequire('app/lib/logger');
var donorsChooseRouter = require('./lib/donorschoose');
var dsCampaignRouter = require('./lib/ds-routing');
var reportbackRouter = require('./lib/reportback');
var slothbotRouter = require('./lib/slothbot');

app.use('/', router);

router.get('/', function (req, res) {
  res.send('hi');
});

router.use(function(req, res, next) {
  var apiKey = process.env.GAMBIT_API_KEY;
  if (req.method === 'POST' && req.headers['x-gambit-api-key'] !== apiKey) {
    logger.warn('router invalid x-gambit-api-key:', req.url);
    return res.sendStatus(403);
  }
  next();
});

// Custom DS routing to Mobile Commons paths for campaigns.
router.use('/ds-routing', dsCampaignRouter);

// Standard Staff Pick campaign report back.
router.use('/reportback', reportbackRouter);

// Integrates with our DS DonorsChoose API account and donates to proposals.
router.use('/v2/bots/donorschoose', donorsChooseRouter);

// Season 2.
router.use('/v2/bots/slothbot', slothbotRouter);
