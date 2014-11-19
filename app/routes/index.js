var express = require('express')
  , router = express.Router();

var multiplayerGameRouter = require('./smsMultiplayerGame')
  , donationsRouter = require('../lib/donations')
  , pregnancyTextRouter = require('../lib/pregnancytext')
  , dsCampaignRouter = require('../lib/ds-routing')
  ;

// Directs all requests to the top-level router. 
app.use('/', router)

// Directs multiplayer game requests to the appropriate router. 
router.use('/sms-multiplayer-game', multiplayerGameRouter);

//Internal module for handling SMS donations.
router.use('/donations', donationsRouter);

//Pregnancy Text 2014
router.use('/pregnancy-text', pregnancyTextRouter);

//Custom DS routing to Mobile Commons paths for campaigns.
router.use('/ds-routing', dsCampaignRouter);