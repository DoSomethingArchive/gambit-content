var assert = require('assert')
  , express = require('express')
  , emitter = rootRequire('app/eventEmitter')
  , connectionOperations = rootRequire('app/config/connectionOperations')
  , gameMappingModel = rootRequire('app/lib/sms-games/models/sgGameMapping')(connectionOperations)
  , gameModel = rootRequire('app/lib/sms-games/models/sgCompetitiveStory')(connectionOperations)
  , userModel = rootRequire('app/lib/sms-games/models/sgUser')(connectionOperations)
  , SGCompetitiveStoryController = rootRequire('app/lib/sms-games/controllers/SGCompetitiveStoryController')
  , smsHelper = rootRequire('app/lib/smsHelpers')
  , testHelper = require('./testHelperFunctions')
  ;

describe('Bully Text 2015 A/B test version being played:', function() {
  var alphaName = 'Axl';
  var alphaPhone = '5555558880';
  var betaName0 = 'Basque';
  var betaName1 = 'Chen-Ling';
  var betaName2 = 'Denzivort';
  var betaPhone0 = '5555558881';
  var betaPhone1 = '5555558882';
  var betaPhone2 = '5555558883';
  var storyId = 301;
  var gameConfig = app.getConfig(app.ConfigName.COMPETITIVE_STORIES, storyId)

  before('instantiating game controller, dummy response', testHelper.gameAppSetup);

  describe('Creating a BullyText 2015 A/B test version game', function() {
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
          beta_mobile_2: betaPhone2,
          beta_first_name_0: betaName0,
          beta_first_name_1: betaName1,
          beta_first_name_2: betaName2
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
        var startOip = gameConfig.story_start_oip;
        gameModel.findOne({_id: gameId}, function(err, doc) {
          if (!err && doc) {
            for (var i = 0; i < doc.players_current_status.length; i++) {
              if (doc.players_current_status[i].opt_in_path == startOip) {
                var phone = doc.players_current_status[i].phone;
                var aPhone = smsHelper.getNormalizedPhone(alphaPhone);
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

    // Level 1. 
    describe(alphaName + ' answers B at L10', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('B')
        .expectNextLevelName('L1B')
        .expectNextLevelMessage(178183)
        .exec();
    });

    describe(alphaName + ' answers B at L1B', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('B')
        .expectNextLevelName('END-LEVEL1').expectNextLevelMessage(178191).exec();
    });

    describe(betaName0 + ' answers B at L10', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('B')
        .expectNextLevelName('L1B')
        .expectNextLevelMessage(178183)
        .exec();
    });

    describe(betaName0 + ' answers B at L1B', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('B')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(178191)
        .exec();
    });

    describe(betaName1 + ' answers B at L10', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('B')
        .expectNextLevelName('L1B')
        .expectNextLevelMessage(178183)
        .exec();
    });

    describe(betaName1 + ' answers B at L1B', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('B')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(178191)
        .exec();
    });

    describe(betaName2 + ' answers B at L10', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('B')
        .expectNextLevelName('L1B')
        .expectNextLevelMessage(178183)
        .exec();
    });

    describe(betaName2 + ' answers B at L1B', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('B')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(178191)
        .expectEndStageName('END-LEVEL1-GROUP')
        .expectEndStageMessage(178195)
        .expectNextStageName('L20')
        .expectNextStageMessage(178197)
        .expectPlayerNamesAnsweredCorrectlyThisLevel([])
        .expectEndLevelPlayerNameSuccessMessage(178436)
        .exec();
    });

    after(function() {
      // Remove all test documents
      userModel.remove({phone: smsHelper.getNormalizedPhone(alphaPhone)}, function() {});
      userModel.remove({phone: smsHelper.getNormalizedPhone(betaPhone0)}, function() {});
      userModel.remove({phone: smsHelper.getNormalizedPhone(betaPhone1)}, function() {});
      userModel.remove({phone: smsHelper.getNormalizedPhone(betaPhone2)}, function() {});
      gameMappingModel.remove({_id: gameMappingId}, function() {});
      gameModel.remove({_id: gameId}, function() {});
      this.gameController = null;
    })
  })
})