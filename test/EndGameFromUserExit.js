var assert = require('assert')
  , express = require('express')
  , emitter = rootRequire('app/eventEmitter')
  , gameMappingModel = rootRequire('app/lib/sms-games/models/sgGameMapping')
  , gameModel = rootRequire('app/lib/sms-games/models/sgCompetitiveStory')
  , userModel = rootRequire('app/lib/sms-games/models/sgUser')
  , SGCompetitiveStoryController = rootRequire('app/lib/sms-games/controllers/SGCompetitiveStoryController')
  , gameConfig = rootRequire('app/lib/sms-games/config/competitive-stories')
  , smsHelper = rootRequire('app/lib/smsHelpers')
  , testHelper = require('./testHelperFunctions')
  ;

describe('Testing end game from user exit by creating two Science Sleuth games', function() {
  var alphaName1 = 'alpha1';
  var alphaPhone1 = '5555550200';
  var betaName0 = 'friend0';
  var betaPhone0 = '5555550201';
  var betaName1 = 'friend1';
  var betaPhone1 = '5555550202';

  var betaPhone2 = '5555550203';
  var betaName2 = 'friend2';

  var alphaName2 = 'alpha2';
  var alphaPhone2 = '5555550204';
  var betaName3 = 'friend3';
  var betaPhone3 = '5555550205';
  var betaName4 = 'friend4';
  var betaPhone4 = '5555550206';

  var storyId = 101;

  testHelper.gameAppSetup();

  describe('Creating Science Sleuth Game 1', function() {
    var request;
    before(function() {
      // Test request object to create the game.
      request = {
        body: {
          story_id: storyId,
          alpha_first_name: alphaName1,
          alpha_mobile: alphaPhone1,
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
      assert.equal(true, this.gameController.createGame(request, response));
    })

    describe('Beta 0 joining the game', function() {
      testHelper.betaJoinGameTest(betaPhone0);
    })

    describe('Beta 1 joining the game', function() {
      testHelper.betaJoinGameTest(betaPhone1);
    })

    describe('Beta 2 joining the game', function() {
      testHelper.betaJoinGameTest(betaPhone2);

      it('should auto-start the game', function(done) {
        var alphaStarted = beta0Started = beta1Started = beta2Started = false; // Chaining assignment operators. They all are set to false. 
        var startOip = gameConfig[storyId].story_start_oip;
        gameModel.findOne({_id: gameId}, function(err, doc) {
          if (!err && doc) {
            for (var i = 0; i < doc.players_current_status.length; i++) {
              if (doc.players_current_status[i].opt_in_path == startOip) {
                var phone = doc.players_current_status[i].phone;
                var aPhone = smsHelper.getNormalizedPhone(alphaPhone1);
                var b0Phone = smsHelper.getNormalizedPhone(betaPhone0);
                var b1Phone = smsHelper.getNormalizedPhone(betaPhone1);
                var b2Phone = smsHelper.getNormalizedPhone(betaPhone2);
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
    })

    describe('Before Game 2 is created, Game 1\'s game_ended property is false.', function() {
      it('should have a game_ended property of false.', function(done) {
        gameModel.findOne({_id: gameId}, function(err, doc) {
          if (doc.game_ended == false) {
            done();
          }
          // Assigning Game 1's ID to a new variable, which allows the ID of Game 2
          // now to be assigned to gameId. A bit hacky, mark for refactoring.
          gameOneId = gameId;
        })
      })
    })
  })

  describe('Creating Science Sleuth Game 2', function() {
    var request;
    before(function() {
      // Test request object to create the game.
      request = {
        body: {
          story_id: storyId,
          alpha_first_name: alphaName2,
          alpha_mobile: alphaPhone2,
          beta_mobile_0: betaPhone2,
          beta_mobile_1: betaPhone3,
          beta_mobile_2: betaPhone4
        }
      };
    })

    it('should emit all game doc events, and send messages to all three players--Alpha1, Beta0, Beta1--that the game has ended.', function(done) {
      var eventCount = 0;
      var expectedEvents = 9;

      // Allows access to .gameController below. 
      var self = this;

      var onEventReceived = function() {
        eventCount++;
        if (eventCount == expectedEvents) {
          done();

          emitter.removeAllListeners('mobilecommons-optin-test')
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

      // 3 users (different from the ones just created) should be notified that Game 1 has ended. 
      emitter.on('mobilecommons-optin-test', function(payload) {
        if (payload.form.opt_in_path == gameConfig[storyId].game_ended_from_exit_oip) {
          onEventReceived();
        }
      })

      // With event listeners setup, can now create the game.
      assert.equal(true, this.gameController.createGame(request, response));
    })

    describe('When Game 2 is created--inviting Beta 2 from Game 1 to Game 2--all necessary state changes occur.', function() {
      it('Game 1 should now have a game_ended property of true.', function(done) {
        gameModel.findOne({_id: gameOneId}, function(err, doc) {
          if (doc.game_ended == true) {
            done();
          }
          else {
            assert(false);
          }
        })
      })

      it('Alpha1 should no longer have a `current_game_id` property.', function(done) {
        userModel.findOne({phone: smsHelper.getNormalizedPhone(alphaPhone1)}, function(err, doc) {
          if (doc && (!doc.current_game_id)) {
            done()
          }
          else {
            assert(false);
          }
        })
      })

      it('Beta0 should no longer have a `current_game_id` property.', function(done) {
        userModel.findOne({phone: smsHelper.getNormalizedPhone(betaPhone0)}, function(err, doc) {
          if (doc && (!doc.current_game_id)) {
            done()
          }
          else {
            assert(false);
          }
        })
      })

      it('Beta1 should no longer have a `current_game_id` property.', function(done) {
        userModel.findOne({phone: smsHelper.getNormalizedPhone(betaPhone1)}, function(err, doc) {
          if (doc && (!doc.current_game_id)) {
            done()
          }
          else {
            assert(false);
          }
        })
      })

      it('Beta2 (the user invited out of Game 1) should now have a `current_game_id` property referencing Game 2\'s ObjectId value.', function(done) {
        userModel.findOne({phone: smsHelper.getNormalizedPhone(betaPhone2)}, function(err, doc) {
          if (doc && doc.current_game_id.equals(gameId)) {
            done()
          }
          else {
            assert(false);
          }
        })
      })

      it('Beta3 should now have a `current_game_id` property referencing Game 2\'s ObjectId value.', function(done) {
        userModel.findOne({phone: smsHelper.getNormalizedPhone(betaPhone3)}, function(err, doc) {
          if (doc && doc.current_game_id.equals(gameId)) {
            done()
          }
          else {
            assert(false);
          }
        })
      })

      it('Beta4 should now have a `current_game_id` property referencing Game 2\'s ObjectId value.', function(done) {
        userModel.findOne({phone: smsHelper.getNormalizedPhone(betaPhone4)}, function(err, doc) {
          if (doc && doc.current_game_id.equals(gameId)) {
            done()
          }
          else {
            assert(false);
          }
        })
      })
    })
  })
  
  after(function() {
    // Remove all test documents.
    userModel.remove({phone: smsHelper.getNormalizedPhone(alphaPhone1)}, function() {});
    userModel.remove({phone: smsHelper.getNormalizedPhone(betaPhone0)}, function() {});
    userModel.remove({phone: smsHelper.getNormalizedPhone(betaPhone1)}, function() {});
    userModel.remove({phone: smsHelper.getNormalizedPhone(betaPhone2)}, function() {});
    userModel.remove({phone: smsHelper.getNormalizedPhone(alphaPhone2)}, function() {});
    userModel.remove({phone: smsHelper.getNormalizedPhone(betaPhone3)}, function() {});
    userModel.remove({phone: smsHelper.getNormalizedPhone(betaPhone4)}, function() {});
    gameMappingModel.remove({_id: gameMappingId}, function() {});
    gameModel.remove({_id: gameId}, function() {});
    gameModel.remove({_id: gameOneId}, function() {});
    this.gameController = null;
    gameId = null;
    gameMappingId = null;
  })
})
