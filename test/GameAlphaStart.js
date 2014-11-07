var assert = require('assert')
  , express = require('express')
  , emitter = require('../app/eventEmitter')
  , messageHelper = require('../app/lib/userMessageHelpers')
  , SGCompetitiveStoryController = require('../app/controllers/SGCompetitiveStoryController')
  ;

describe('Alpha-Starting a game based on the test config file:', function() {
  // Test players' details.
  var alphaName = 'alpha';
  var alphaPhone = '5555550100';
  var betaName0 = 'friend0';
  var betaName1 = 'friend1';
  var betaName2 = 'friend2';
  var betaPhone0 = '5555550101';
  var betaPhone1 = '5555550102';
  var betaPhone2 = '5555550103';
  var storyId = 1;

  before('instantiating Express app, game controller, game config, dummy response', function() {
    var app = express();
    require('../app/config')(app, express);

    this.gameController = new SGCompetitiveStoryController(app);

    // Reassigning the this.gameConfig property of the controller we just
    // instantiated to use our test config file. 
    this.gameController.gameConfig = require('./test_config/test-competitive-stories');
    // Because of the unique scope of the before() hook, 
    // the variables below weren't actually used/reassigned in testing. 
    // They're defined much lower, globally. 
    // var gameId = 0; 
    // var gameMappingId = 0;

    // Dummy Express response object.
    response = {
      send: function(code, message) {
        if (typeof code === 'undefined') {
          code = 200;
        }
        if (typeof message === 'undefined') {
          if (code == 200) {
            message = 'OK';
          }
          else {
            message = '';
          } 
        }

        console.log('Response: ' + code + ' - ' + message);
      }
    };
  })

  describe('Creating a Competitive Story game based on the test config file', function() {
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
    });

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
      // 1 expected game-mapping-created event. (Callback function takes a 'doc' 
      // argument because the emitter.emit() function gets passed a Mongo doc.)
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
      assert.equal(true, this.gameController.createGame(request, response));
    });

    it('should add sg_user doc for alpha user', function(done) {
      var phone = messageHelper.getNormalizedPhone(alphaPhone);
      this.gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta0 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone0);
      this.gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta1 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone1);
      this.gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta2 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone2);
      this.gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add a sg_gamemapping document', function(done) {
      this.gameController.gameMappingModel.find({_id: gameMappingId}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add a sg_competitivestory_game document', function(done) {
      this.gameController.gameModel.find({_id: gameId}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
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
      this.gameController.betaJoinGame(request, response);
    })

    it('should update the game document', function(done) {
      this.gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
        var updated = false;
        if (!err && doc) {
          for (var i = 0; i < doc.betas.length; i++) {
            if (doc.betas[i].phone == phone && doc.betas[i].invite_accepted) {
              updated = true;
              done();
            }
          }
        }

        if (!updated) { assert(false); }
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
      this.gameController.alphaStartGame(request, response);
    })

    it('should start the game', function(done) {
      var alphaStarted = beta1Started = false;
      var startOip = this.gameController.gameConfig[storyId].story_start_oip;
      this.gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
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
    this.gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(alphaPhone)}, function() {});
    this.gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone0)}, function() {});
    this.gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone1)}, function() {});
    this.gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone2)}, function() {});
    this.gameController.gameMappingModel.remove({_id: gameMappingId}, function() {});
    this.gameController.gameModel.remove({_id: gameId}, function() {});
    this.gameController = null;
  })
})
