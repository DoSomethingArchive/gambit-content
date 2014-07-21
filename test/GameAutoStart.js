var assert = require('assert')
  , express = require('express')
  , emitter = require('../app/eventEmitter')
  , SGCompetitiveStoryController = require('../app/controllers/SGCompetitiveStoryController')
  ;

describe('Auto-Start Game:', function() {
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
          person: {
            first_name: alphaName,
            phone: alphaPhone
          },
          friends: [
            {
              first_name: betaName0,
              phone: betaPhone0
            },
            {
              first_name: betaName1,
              phone: betaPhone1
            },
            {
              first_name: betaName2,
              phone: betaPhone2
            }
          ]
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
      var phone = gameController.getNormalizedPhone(alphaPhone);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) done();
        else assert(false);
      })
    })

    it('should add sg_user doc for beta0 user', function(done) {
      var phone = gameController.getNormalizedPhone(betaPhone0);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) done();
        else assert(false);
      })
    })

    it('should add sg_user doc for beta1 user', function(done) {
      var phone = gameController.getNormalizedPhone(betaPhone1);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) done();
        else assert(false);
      })
    })

    it('should add sg_user doc for beta2 user', function(done) {
      var phone = gameController.getNormalizedPhone(betaPhone2);
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
      phone = gameController.getNormalizedPhone(phone);
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

  describe('Beta 0 joining the game', function() {
    betaJoinGameTest(betaPhone0);
  })

  describe('Beta 1 joining the game', function() {
    betaJoinGameTest(betaPhone1);
  })

  describe('Beta 2 joining the game', function() {
    betaJoinGameTest(betaPhone2);

    it('should auto-start the game', function(done) {
      var alphaStarted = beta0Started = beta1Started = beta2Started = false;
      var startOip = gameConfig[storyId].story_start_oip;
      gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
        if (!err && doc) {
          for (var i = 0; i < doc.players_current_status.length; i++) {
            if (doc.players_current_status[i].opt_in_path == startOip) {
              var phone = doc.players_current_status[i].phone;
              var aPhone = gameController.getNormalizedPhone(alphaPhone);
              var b0Phone = gameController.getNormalizedPhone(betaPhone0);
              var b1Phone = gameController.getNormalizedPhone(betaPhone1);
              var b2Phone = gameController.getNormalizedPhone(betaPhone2);
              if (phone == aPhone)
                alphaStarted = true;
              else if (phone == b0Phone)
                beta0Started = true;
              else if (phone == b1Phone)
                beta1Started = true;
              else if (phone == b2Phone)
                beta2Started = true;
            }
          }
        }

        assert(alphaStarted && beta0Started && beta1Started && beta2Started);
        done();
      })
    })

    it('should send the start message to all players')
  })

  after(function() {
    // Remove all test documents
    gameController.userModel.remove({phone: gameController.getNormalizedPhone(alphaPhone)}, function() {});
    gameController.userModel.remove({phone: gameController.getNormalizedPhone(betaPhone0)}, function() {});
    gameController.userModel.remove({phone: gameController.getNormalizedPhone(betaPhone1)}, function() {});
    gameController.userModel.remove({phone: gameController.getNormalizedPhone(betaPhone2)}, function() {});
    gameController.gameMappingModel.remove({_id: gameMappingId}, function() {});
    gameController.gameModel.remove({_id: gameId}, function() {});
  })
});
