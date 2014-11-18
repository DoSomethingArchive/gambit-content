module.exports = function(app, express) {

  var multiplayerGameRouter = require('./smsMultiplayerGame')
    , donationsRouter = require('../lib/donations');

  var router = express.Router(); 

  // Directs all requests to the top-level router. 
  app.use('/', router)

  // Directs multiplayer game requests to the appropriate router. 
  router.use('/sms-multiplayer-game', multiplayerGameRouter);

  //Internal module for handling SMS donations.
  router.use('/donations', donationsRouter);

  //Pregnancy Text 2014
  require('../lib/pregnancytext')(app);

  //Custom DS routing to Mobile Commons paths for campaigns.
  require('../lib/ds-routing')(app);

}