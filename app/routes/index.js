module.exports = function(app, express) {

  var multiplayerGameRouter = require('./smsMultiplayerGame')

  var router = express.Router(); 

  router.use('/sms-multiplayer-game', multiplayerGameRouter)

  //Internal module for handling SMS donations.
  require('../lib/donations')(app);

  //Pregnancy Text 2014
  require('../lib/pregnancytext')(app);

  //Custom DS routing to Mobile Commons paths for campaigns.
  require('../lib/ds-routing')(app);


}
