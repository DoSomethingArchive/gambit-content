var express = require('express')
  , router = express.Router();

var multiplayerGameRouter = require('./lib/sms-games')
  , donationsRouter = require('./lib/donations')
  , dsCampaignRouter = require('./lib/ds-routing')
  , reportback = require('./lib/reportback')
  , slothbot = require('./lib/slothbot')
  ;

// Directs all requests to the top-level router. 
app.use('/', router);

// Directs multiplayer game requests to the appropriate router. 
router.use('/sms-multiplayer-game', multiplayerGameRouter);

// Internal module for handling SMS donations.
router.use('/donations', donationsRouter);

// Custom DS routing to Mobile Commons paths for campaigns.
router.use('/ds-routing', dsCampaignRouter);

// Standard Staff Pick campaign report back.
router.use('/reportback', reportback);

// Season 2.
router.use('/slothbot', slothbot);
