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

describe('Science Sleuth game being played:', function() {
  var alphaName = 'alpha';
  var alphaPhone = '5555550600';
  var betaName0 = 'friend0';
  var betaName1 = 'friend1';
  var betaName2 = 'friend2';
  var betaPhone0 = '5555550601';
  var betaPhone1 = '5555550602';
  var betaPhone2 = '5555550603';
  var storyId = 101;
  var gameConfig = app.getConfig(app.ConfigName.COMPETITIVE_STORIES, storyId)

  before('instantiating game controller, dummy response', testHelper.gameAppSetup);

  describe('Creating a Science Sleuth game', function() {
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
      assert.equal(true, this.gameController.createGame(request, response));
    })

    it('should add sg_user doc for alpha user', function(done) {
      var phone = smsHelper.getNormalizedPhone(alphaPhone);
      userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta0 user', function(done) {
      var phone = smsHelper.getNormalizedPhone(betaPhone0);
      userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta1 user', function(done) {
      var phone = smsHelper.getNormalizedPhone(betaPhone1);
      userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta2 user', function(done) {
      var phone = smsHelper.getNormalizedPhone(betaPhone2);
      userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add a sg_gamemapping document', function(done) {
      gameMappingModel.find({_id: gameMappingId}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add a sg_competitivestory_game document', function(done) {
      gameModel.find({_id: gameId}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should have a sg_competitivestory_game document with Science Sleuth\'s story_id of 101', function(done) {
      gameModel.findOne({_id: gameId}, function(err, doc) {
        if (!err && doc.story_id == 101) { done(); }
        else { assert(false); }
      })
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

    // Gameplay. 

    // Level 1. 
    describe('Alpha answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(172149)
        .exec();
    });

    describe('Alpha answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1').expectNextLevelMessage(172153).exec();
    });

    describe('Beta0 answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(172149)
        .exec();
    });

    describe('Beta0 answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(172153)
        .exec();
    });

    describe('Beta1 answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(172149)
        .exec();
    });

    describe('Beta1 answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(172153)
        .exec();
    });

    describe('Beta2 answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(172149)
        .exec();
    });

    describe('Beta2 answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(172153)
        .expectEndStageName('END-LEVEL1-GROUP')
        .expectEndStageMessage(172163)
        .expectNextStageName('2-0')
        .expectNextStageMessage(172165)
        .exec();
    });

    // Level 2. 
    describe('Alpha answers A at Level 2-0', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('21A')
        .expectNextLevelMessage(172167)
        .exec();
    });

    describe('Alpha answers A at Level 2-1A', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL2')
        .expectNextLevelMessage(172171)
        .exec();
    });

    describe('Beta0 answers A at Level 2-0', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('21A')
        .expectNextLevelMessage(172167)
        .exec();
    });

    describe('Beta0 answers A at Level 2-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL2')
        .expectNextLevelMessage(172171)
        .exec();
    });

    describe('Beta1 answers A at Level 2-0', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('21A')
        .expectNextLevelMessage(172167)
        .exec();
    });

    describe('Beta1 answers A at Level 2-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL2')
        .expectNextLevelMessage(172171)
        .exec();
    });

    describe('Beta2 answers A at Level 2-0', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('21A')
        .expectNextLevelMessage(172167)
        .exec();
    });

    describe('Beta2 answers A at Level 2-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL2')
        .expectNextLevelMessage(172171)
        .expectEndStageName('END-LEVEL2-GROUP')
        .expectEndStageMessage(172179)
        .expectNextStageName('3-0')
        .expectNextStageMessage(172183)
        .exec();
    });

    //Level 3.
    describe('Alpha answers A at Level 3-0', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('31A')
        .expectNextLevelMessage(172185)
        .exec();
    });

    describe('Alpha answers A at Level 3-1A', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL3')
        .expectNextLevelMessage(172189)
        .exec();
    });

    describe('Beta0 answers A at Level 3-0', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('31A')
        .expectNextLevelMessage(172185)
        .exec();
    });

    describe('Beta0 answers A at Level 3-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL3')
        .expectNextLevelMessage(172189)
        .exec();
    });

    describe('Beta1 answers A at Level 3-0', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('31A')
        .expectNextLevelMessage(172185)
        .exec();
    });

    describe('Beta1 answers A at Level 3-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL3')
        .expectNextLevelMessage(172189)
        .exec();
    });

    describe('Beta2 answers A at Level 3-0', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('31A')
        .expectNextLevelMessage(172185)
        .exec();
    });

    describe('Beta2 answers A at Level 3-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL3')
        .expectNextLevelMessage(172189)
        .expectEndStageName('END-LEVEL3-GROUP')
        .expectEndStageMessage(172197)
        .expectNextStageName('4-0')
        .expectNextStageMessage(172201)
        .exec();
    });

    //Level 4. 
    describe('Alpha answers A at Level 4-0', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('41A')
        .expectNextLevelMessage(172203)
        .exec();
    });

    describe('Alpha answers A at Level 4-1A', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL4')
        .expectNextLevelMessage(172207)
        .exec();
    });

    describe('Beta0 answers A at Level 4-0', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('41A')
        .expectNextLevelMessage(172203)
        .exec();
    });

    describe('Beta0 answers A at Level 4-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL4')
        .expectNextLevelMessage(172207)
        .exec();
    });

    describe('Beta1 answers A at Level 4-0', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('41A')
        .expectNextLevelMessage(172203)
        .exec();
    });

    describe('Beta1 answers A at Level 4-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL4')
        .expectNextLevelMessage(172207)
        .exec();
    });

    describe('Beta2 answers A at Level 4-0', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('41A')
        .expectNextLevelMessage(172203)
        .exec();
    });

    describe('Beta2 answers A at Level 4-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL4')
        .expectNextLevelMessage(172207)
        .expectEndStageName('END-LEVEL4-GROUP')
        .expectEndStageMessage(172215)
        .expectNextStageName('5-0')
        .expectNextStageMessage(172219)
        .exec();
    });

    //Level 5. 
    describe('Alpha answers A at Level 5-0', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('51A')
        .expectNextLevelMessage(172221)
        .exec();
    });

    describe('Alpha answers A at Level 5-1A', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL5')
        .expectNextLevelMessage(172225)
        .exec();
    });

    describe('Beta0 answers A at Level 5-0', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('51A')
        .expectNextLevelMessage(172221)
        .exec();
    });

    describe('Beta0 answers A at Level 5-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL5')
        .expectNextLevelMessage(172225)
        .exec();
    });

    describe('Beta1 answers A at Level 5-0', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('51A')
        .expectNextLevelMessage(172221)
        .exec();
    });

    describe('Beta1 answers A at Level 5-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL5')
        .expectNextLevelMessage(172225)
        .exec();
    });

    describe('Beta2 answers A at Level 5-0', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('51A')
        .expectNextLevelMessage(172221)
        .exec();
    });

    describe('Beta2 answers A at Level 5-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL5')
        .expectNextLevelMessage(172225)
        .expectEndStageName('END-LEVEL5-GROUP')
        .expectEndStageMessage(172235)
        .expectNextStageName('6-0')
        .expectNextStageMessage(172237)
        .exec();
    });

    //Level 6. 
    describe('Alpha answers A at Level 6-0', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('61A')
        .expectNextLevelMessage(172239)
        .exec();
    });

    describe('Alpha answers A at Level 6-1A', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL6')
        .expectNextLevelMessage(172243)
        .exec();
    });

    describe('Beta0 answers A at Level 6-0', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('61A')
        .expectNextLevelMessage(172239)
        .exec();
    });

    describe('Beta0 answers A at Level 6-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL6')
        .expectNextLevelMessage(172243)
        .exec();
    });

    describe('Beta1 answers A at Level 6-0', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('61A')
        .expectNextLevelMessage(172239)
        .exec();
    });

    describe('Beta1 answers A at Level 6-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL6')
        .expectNextLevelMessage(172243)
        .exec();
    });

    describe('Beta2 answers A at Level 6-0', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('61A')
        .expectNextLevelMessage(172239)
        .exec();
    });

    describe('Beta2 answers A at Level 6-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL6')
        .expectNextLevelMessage(172243)
        .expectEndStageName('END-LEVEL6-GROUP')
        .expectEndStageMessage(172253)
        .expectEndGameGroupMessageFormat('rankings-within-group-based')
        .expectEndGameGroupMessage(172281)
        .expectEndGameIndividualMessageFormat('group-success-failure-based')
        .expectEndGameIndividualMessage(172297)
        .exec();
    });
  })
  
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
