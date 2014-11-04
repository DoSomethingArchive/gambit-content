var assert = require('assert')
  , express = require('express')
  , emitter = require('../app/eventEmitter')
  , messageHelper = require('../app/lib/userMessageHelpers')
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

    gameController = new SGCompetitiveStoryController(app);

    // Reassigning the this.gameConfig property of the controller we just
    // instantiated to use our test config file. 
    gameController.gameConfig = require('./test_config/test-competitive-stories');
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
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta0 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone0);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta1 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone1);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta2 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone2);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add a sg_gamemapping document', function(done) {
      gameController.gameMappingModel.find({_id: gameMappingId}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add a sg_competitivestory_game document', function(done) {
      gameController.gameModel.find({_id: gameId}, function(err, docs) {
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
      var alphaStarted = beta0Started = beta1Started = beta2Started = false; // Chaining assignment operators. They all are set to false. 
      var startOip = gameController.gameConfig[storyId].story_start_oip;
      gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
        if (!err && doc) {
          for (var i = 0; i < doc.players_current_status.length; i++) {
            if (doc.players_current_status[i].opt_in_path == startOip) {
              var phone = doc.players_current_status[i].phone;
              var aPhone = messageHelper.getNormalizedPhone(alphaPhone);
              var b0Phone = messageHelper.getNormalizedPhone(betaPhone0);
              var b1Phone = messageHelper.getNormalizedPhone(betaPhone1);
              var b2Phone = messageHelper.getNormalizedPhone(betaPhone2);
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
  
  /**
   * Tests that if a user's the last user to act at the end of a level,
   * that we've opted her into the proper end-level opt in path, 
   * that we've opted the group into the proper group end-level message, 
   * and that we've opted the group into the proper next-level start message. 
   * 
   * Notice that we've structured the function to use chained function calls for clarity. 
   * 
   * @param phone
   *  The user's phone number. 
   * @param input
   *  What we're simulating the user texting in.
   * @param nextLevelName
   *  The name of the end-level message we're opting the individual into, for test readability purposes. (ex: 'L11B')
   * @param nextLevelMessage
   *  The OIP of the end-level message the user should be opted into. 
   * @param endStageName 
   *  The name of the end-level group message, for readability purposes.
   * @param endStageMessage
   *  The OIP of the end-level group message. 
   * @param nextStageName
   *  The name of the next-level group message, for readability purposes. 
   * @param nextStageMessage
   *  The OIP of the next-level group message, or the OIP of the end-game message.
   */


  function userActionTest() {
    return {
      withPhone: function(phone) {
        this.phone = phone; 
        return this;
      },
      withUserInput: function(input) {
        this.input = input;
        return this;
      },

      expectNextLevelName: function(nextLevelName) {
        this.nextLevelName = nextLevelName;
        return this;
      },
      expectNextLevelMessage: function(nextLevelMessage) {
        this.nextLevelMessage = nextLevelMessage;
        return this;
      },

      expectEndStageName: function(endStageName) {
        this.endStageName = endStageName;
        return this;
      }, 
      expectEndStageMessage: function(endStageMessage) {
        this.endStageMessage = endStageMessage;
        return this;
      },

      expectNextStageName: function(nextStageName) {
        this.nextStageName = nextStageName;
        return this;
      },
      expectNextStageMessage: function(nextStageMessage) {
        this.nextStageMessage = nextStageMessage;
        return this;
      },

      exec: function() {
        var request;
        var self = this;
        before(function() {
          phone = messageHelper.getNormalizedPhone(self.phone);
          request = {
            body: {
              phone: self.phone, 
              args: self.input
            }
          }
        })

        it('should emit player-status-updated event', function(done) {
          emitter.on('player-status-updated', function() {
            done();
            emitter.removeAllListeners('player-status-updated');
          })

          // Simulates the user game action. 
          gameController.userAction(request, response);
        })


        it('should move user to level ' + this.nextLevelName + ' (optin path: ' + this.nextLevelMessage + ') in the game doc', function(done) {

          gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
            var playersCurrentStatus = doc.players_current_status
            var storyResults = doc.story_results;
            var updated = false;

            for (var i = 0; i < playersCurrentStatus.length; i++) {
              if (playersCurrentStatus[i].phone == phone && playersCurrentStatus[i].opt_in_path == self.nextLevelMessage) {
                updated = true;
              }
            }

            if (!updated) {
              for (var i = 0; i < storyResults.length; i++) {
                if (storyResults[i].phone == phone && storyResults[i].oip == self.nextLevelMessage) {
                  updated = true;
                }
              }
            }

            if (updated) {
              done();
            } 
            else {
              assert(false);
            }
          }) 
        })

        // If supplied the arguments, test for a group end-level message.
        if (this.endStageName && this.endStageMessage) {
          it('should deliver the end-level group message for ' + this.endStageName + ' to all users in group',  function(done) {
            gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
              if (!err) {
                var storyResults = doc.story_results;
                var numberOfActivePlayers = doc.players_current_status.length;
                for (var i = 0; i < storyResults.length; i ++) {
                  if (storyResults[i].oip === self.endStageMessage) {
                    numberOfActivePlayers--;
                  }
                }
                if (!numberOfActivePlayers) {
                  done();
                } else {
                  assert(false);
                }
              }
            })
          })
        }

        // If supplied the arguments, test for the message which moves all players to the next level. 
        if (this.nextStageName && this.nextStageMessage) {
          it('should move all players to ' + this.nextStageName, function(done) {
            gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
              if (!err) {
                var playersCurrentStatus = doc.players_current_status;
                var allPlayersAtNextLevel = true;
                for (var i = 0; i < playersCurrentStatus.length; i ++) {
                  if (playersCurrentStatus[i].opt_in_path != self.nextStageMessage) {
                    allPlayersAtNextLevel = false;
                  }
                }
                if (allPlayersAtNextLevel) {
                  done();
                } 
                else {
                  assert(false);
                }
              }
            })
          })
        }
      }
    }
  }
  
  describe('Alpha answers A at Level 1-0', function() {
    userActionTest().withPhone(alphaPhone).withUserInput('A').expectNextLevelName('11A').expectNextLevelMessage(168455).exec();
  })

  describe('Alpha answers A at Level 1-1', function() {
    userActionTest().withPhone(alphaPhone).withUserInput('A').expectNextLevelName('12A').expectNextLevelMessage(168459).exec();
  })

  describe('Alpha answers A at Level 1-2', function() {
    userActionTest().withPhone(alphaPhone).withUserInput('A').expectNextLevelName('13A').expectNextLevelMessage(168657).exec();
  })

  describe('Alpha answers A at Level 1-3', function() {
    userActionTest().withPhone(alphaPhone).withUserInput('A').expectNextLevelName('END-LEVEL1').expectNextLevelMessage(168825).exec();
  })


  describe('Beta0 answers A at Level 1-0', function() {
    userActionTest().withPhone(betaPhone0).withUserInput('A').expectNextLevelName('11A').expectNextLevelMessage(168455).exec();
  })

  describe('Beta0 answers A at Level 1-1', function() {
    userActionTest().withPhone(betaPhone0).withUserInput('A').expectNextLevelName('12A').expectNextLevelMessage(168459).exec();
  })

  describe('Beta0 answers A at Level 1-2', function() {
    userActionTest().withPhone(betaPhone0).withUserInput('A').expectNextLevelName('13A').expectNextLevelMessage(168657).exec();
  })

  describe('Beta0 answers A at Level 1-3', function() {
    userActionTest().withPhone(betaPhone0).withUserInput('A').expectNextLevelName('END-LEVEL1').expectNextLevelMessage(168825).exec();
  })


  describe('Beta1 answers A at Level 1-0', function() {
    userActionTest().withPhone(betaPhone1).withUserInput('A').expectNextLevelName('11A').expectNextLevelMessage(168455).exec();
  })

  describe('Beta1 answers A at Level 1-1', function() {
    userActionTest().withPhone(betaPhone1).withUserInput('A').expectNextLevelName('12A').expectNextLevelMessage(168459).exec();
  })

  describe('Beta1 answers A at Level 1-2', function() {
    userActionTest().withPhone(betaPhone1).withUserInput('A').expectNextLevelName('13A').expectNextLevelMessage(168657).exec();
  })

  describe('Beta1 answers A at Level 1-3', function() {
    userActionTest().withPhone(betaPhone1).withUserInput('A').expectNextLevelName('13A').expectNextLevelMessage(168825).exec();
  })


  describe('Beta2 answers A at Level 1-0', function() {
    userActionTest().withPhone(betaPhone2).withUserInput('A').expectNextLevelName('11A').expectNextLevelMessage(168455).exec();
  })

  describe('Beta2 answers A at Level 1-1', function() {
    userActionTest().withPhone(betaPhone2).withUserInput('A').expectNextLevelName('12A').expectNextLevelMessage(168459).exec();
  })

  describe('Beta2 answers A at Level 1-2', function() {
    userActionTest().withPhone(betaPhone2).withUserInput('A').expectNextLevelName('13A').expectNextLevelMessage(168657).exec();
  })

  describe('Beta2 answers A at Level 1-3', function() {
    userActionTest().withPhone(betaPhone2).withUserInput('A').expectNextLevelName('14A').expectNextLevelMessage(168825).expectEndStageName('END-LEVEL1-GROUP').expectEndStageMessage(168897).expectNextStageName('2-0').expectNextStageMessage(168901).exec();
  })

  describe('Alpha answers A at Level 2-0', function() {
    userActionTest().withPhone(alphaPhone).withUserInput('A').expectNextLevelName('21A').expectNextLevelMessage(169071).exec();
  })

  describe('Alpha answers A at Level 2-1', function() {
    userActionTest().withPhone(alphaPhone).withUserInput('A').expectNextLevelName('22A').expectNextLevelMessage(169075).exec();
  })

  describe('Alpha answers A at Level 2-2', function() {
    userActionTest().withPhone(alphaPhone).withUserInput('A').expectNextLevelName('END-LEVEL2').expectNextLevelMessage(169083).exec();
  })

  describe('Beta0 answers A at Level 2-0', function() {
    userActionTest().withPhone(betaPhone0).withUserInput('A').expectNextLevelName('21A').expectNextLevelMessage(169071).exec();
  })

  describe('Beta0 answers A at Level 2-1', function() {
    userActionTest().withPhone(betaPhone0).withUserInput('A').expectNextLevelName('22A').expectNextLevelMessage(169075).exec();
  })

  describe('Beta0 answers A at Level 2-2', function() {
    userActionTest().withPhone(betaPhone0).withUserInput('A').expectNextLevelName('LEVEL2').expectNextLevelMessage(169083).exec();
  })

  describe('Beta1 answers A at Level 2-0', function() {
    userActionTest().withPhone(betaPhone1).withUserInput('A').expectNextLevelName('21A').expectNextLevelMessage(169071).exec();
  })

  describe('Beta1 answers A at Level 2-1', function() {
    userActionTest().withPhone(betaPhone1).withUserInput('A').expectNextLevelName('22A').expectNextLevelMessage(169075).exec();
  })

  describe('Beta1 answers A at Level 2-2', function() {
    userActionTest().withPhone(betaPhone1).withUserInput('A').expectNextLevelName('END-LEVEL2').expectNextLevelMessage(169083).exec();
  })

  describe('Beta2 answers A at Level 2-0', function() {
    userActionTest().withPhone(betaPhone2).withUserInput('A').expectNextLevelName('21A').expectNextLevelMessage(169071).exec();
  })

  describe('Beta2 answers A at Level 2-1', function() {
    userActionTest().withPhone(betaPhone2).withUserInput('A').expectNextLevelName('22A').expectNextLevelMessage(169075).exec();
  })

  describe('Beta2 answers A at Level 2-2', function() {
    userActionTest().withPhone(betaPhone2).withUserInput('A').expectNextLevelName('END-LEVEL2').expectNextLevelMessage(169083).expectEndStageName('END-LEVEL2-GROUP').expectEndStageMessage(169087).expectNextStageName('END-GAME').expectNextStageMessage(169197).exec();
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
});
