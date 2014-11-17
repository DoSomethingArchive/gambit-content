// var SGCreateFromMobileController = require('../controllers/SGCreateFromMobileController')
//   , SGCollaborativeStoryController = require('../controllers/SGCollaborativeStoryController')
//   , SGCompetitiveStoryController = require('../controllers/SGCompetitiveStoryController')
//   , SGMostLikelyToController = require('../controllers/SGMostLikelyToController')
//   , SGSoloController = require('../controllers/SGSoloController')
//   ;

var multiplayerGameRouter = require('./smsMultiplayerGame')

module.exports = function(app, express) {

  var router = express.Router(); 



  router.use('/sms-multiplayer-game', multiplayerGameRouter)

  //Internal module for handling SMS donations.
  require('../lib/donations')(app);

  //Pregnancy Text 2014
  require('../lib/pregnancytext')(app);

  //Custom DS routing to Mobile Commons paths for campaigns.
  require('../lib/ds-routing')(app);


}
