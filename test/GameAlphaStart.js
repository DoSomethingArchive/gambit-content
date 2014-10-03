var assert = require('assert')
  , express = require('express')
  , emitter = require('../app/eventEmitter')
  , messageHelper = require('../app/lib/userMessageHelpers')
  , SGCompetitiveStoryController = require('../app/controllers/SGCompetitiveStoryController')
  ;

describe('Alpha-Start Game:', function() {
  // Test players' details.
  alphaName = 'alpha';
  alphaPhone = '5555550100';
  betaName0 = 'friend0';
  betaName1 = 'friend1';
  betaName2 = 'friend2';
  betaPhone0 = '5555550101';
  betaPhone1 = '5555550102';
  betaPhone2 = '5555550103';
  storyId = 1;

  before(function() {
    app = express();
    require('../app/config')(app, express);

    // Note that the gameConfig required below isn't actually used 
    // by the competitive game creation process, since the 
    // SGCompetitiveGameStoryController requires its own config file 
    // upon controller creation. 
    gameConfig = app.get('competitive-stories');

    gameController = new SGCompetitiveStoryController(app);
    gameId = 0;
    gameMappingId = 0;

    // Dummy Express response object.
    response = {
        send: function(code, message) {
          if (typeof code === 'undefined') {
            code = 200;
          }
          if (typeof message === 'undefined') {
            if (code == 200)
              message = 'OK';
            else
              message = '';
          }

          console.log('Response: ' + code + ' - ' + message);
        }
    };
  })

  describe('Creating a Competitive Story game', function() {
    var request;
    before(function() {
      // Test request object to create the game.
      request = {
        body: {
          story_id: storyId,
          alpha_first_name: alphaName,
          alpha_mobile: alphaPhone,
          beta_mobile_0: betaPhone0,
          beta_mobile_1: betaPhone1,
          beta_mobile_2: betaPhone2
        }
      };
    })

    it('should emit all game doc events', function(done) {
      var eventCount = 0;
      var expectedEvents = 6;

      var onEventReceived = function() {
        eventCount++;
        if (eventCount == expectedEvents) {
          done();

          emitter.removeAllListeners('alpha-user-created');
          emitter.removeAllListeners('beta-user-created');
          emitter.removeAllListeners('game-mapping-created');
          emitter.removeAllListeners('game-created');
        }
      };

      // 1 expected alpha-user-created event
      emitter.on('alpha-user-created', onEventReceived);
      // 3 expected beta-user-created events
      emitter.on('beta-user-created', onEventReceived);
      // 1 expected game-mapping-created event
      emitter.on('game-mapping-created', function(doc) {
        gameMappingId = doc._id;
        onEventReceived();
      });
      // 1 expected game-created event
      emitter.on('game-created', function(doc) {
        gameId = doc._id;
        onEventReceived();
      });

      // With event listeners setup, can now create the game.
      assert.equal(true, gameController.createGame(request, response));
    })

    it('should add sg_user doc for alpha user', function(done) {
      var phone = messageHelper.getNormalizedPhone(alphaPhone);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) done();
        else assert(false);
      })
    })

    it('should add sg_user doc for beta0 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone0);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) done();
        else assert(false);
      })
    })

    it('should add sg_user doc for beta1 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone1);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) done();
        else assert(false);
      })
    })

    it('should add sg_user doc for beta2 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone2);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) done();
        else assert(false);
      })
    })

    it('should add a sg_gamemapping document', function(done) {
      gameController.gameMappingModel.find({_id: gameMappingId}, function(err, docs) {
        if (!err && docs.length > 0) done();
        else assert(false);
      })
    })

    it('should add a sg_competitivestory_game document', function(done) {
      gameController.gameModel.find({_id: gameId}, function(err, docs) {
        if (!err && docs.length > 0) done();
        else assert(false);
      })
    })
  })

// Describe test for betas joining the game.
  var betaJoinGameTest = function(_phone) {
    var request;
    var phone = _phone;
    before(function() {
      phone = messageHelper.getNormalizedPhone(phone);
      request = {
        body: {
          phone: phone,
          args: 'Y'
        }
      }
    })

    it('should emit game-updated event', function(done) {
      emitter.on('game-updated', function() {
        done();
        emitter.removeAllListeners('game-updated');
      });

      // Join beta user to the game.
      gameController.betaJoinGame(request, response);
    })

    it('should update the game document', function(done) {
      gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
        var updated = false;
        if (!err && doc) {
          for (var i = 0; i < doc.betas.length; i++) {
            if (doc.betas[i].phone == phone && doc.betas[i].invite_accepted) {
              updated = true;
              done();
            }
          }
        }

        if (!updated) assert(false);
      })
    })
    it('should send a Mobile Commons opt-in to Beta(' + phone + ')')
    it('should send a Mobile Commons opt-in to Alpha')
  };

  describe('Beta 1 joining the game', function() {
    betaJoinGameTest(betaPhone1);
  })

  describe('Alpha starting the game', function() {
    var request;
    before(function() {
      phone = messageHelper.getNormalizedPhone(alphaPhone);
      request = {
        body: {
          phone: phone,
          args: 'Y'
        }
      }
    })

    it('should emit game-updated event', function(done) {
      emitter.on('game-updated', function() {
        done();
        emitter.removeAllListeners('game-updated');
      });

      // Alpha force starts the game.
      gameController.alphaStartGame(request, response);
    })

    it('should start the game', function(done) {
      var alphaStarted = beta1Started = false;
      var startOip = gameConfig[storyId].story_start_oip;
      gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
        if (!err && doc) {
          for (var i = 0; i < doc.players_current_status.length; i++) {
            var phone = doc.players_current_status[i].phone;
            var currPath = doc.players_current_status[i].opt_in_path;

            var aPhone = messageHelper.getNormalizedPhone(alphaPhone);
            var b0Phone = messageHelper.getNormalizedPhone(betaPhone0);
            var b1Phone = messageHelper.getNormalizedPhone(betaPhone1);
            var b2Phone = messageHelper.getNormalizedPhone(betaPhone2);

            if (phone == b0Phone || phone == b2Phone) {
              assert(false, 'Beta users sent message when they shouldn\'t have received any.');
            }
            else if (currPath == startOip) {
              if (phone == aPhone)
                alphaStarted = true;
              else if (phone == b1Phone)
                beta1Started = true;
            }
          }
        }

        assert(alphaStarted && beta1Started);
        done();
      })
    })
  })

  after(function() {
    // Remove all test documents
    gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(alphaPhone)}, function() {});
    gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone0)}, function() {});
    gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone1)}, function() {});
    gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone2)}, function() {});
    gameController.gameMappingModel.remove({_id: gameMappingId}, function() {});
    gameController.gameModel.remove({_id: gameId}, function() {});
  })
})
