var assert = require('assert')
  , express = require('express')
  , emitter = require('../app/eventEmitter')
  , connectionOperations = rootRequire('app/config/connectionOperations')
  , gameMappingModel = rootRequire('app/lib/sms-games/models/sgGameMapping')(connectionOperations)
  , gameModel = rootRequire('app/lib/sms-games/models/sgCompetitiveStory')(connectionOperations)
  , userModel = rootRequire('app/lib/sms-games/models/sgUser')(connectionOperations)
  , SGCompetitiveStoryController = require('../app/lib/sms-games/controllers/SGCompetitiveStoryController')
  , smsHelper = require('../app/lib/smsHelpers')
  ;

// Provides necessary setup conditions before game tests. 
exports.gameAppSetup = function() {
  before('instantiating game controller, dummy response', function() {

    this.gameController = new SGCompetitiveStoryController;

    // Dummy Express response object.
    response = {
      send: function(message) {
        if (typeof message === 'undefined') {
          message = '';
        }
        console.log('Response message: ' + message);
      },

      sendStatus: function(code) {
        console.log('Response code: ' + code);
      },

      status: function(code) {
        console.log('Response code: ' + code);
      }
    };
  })
}

// Describe test for betas joining the game.
exports.betaJoinGameTest = function(_phone) {
  var request;
  var phone = _phone;
  before(function() {
    phone = smsHelper.getNormalizedPhone(phone);
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
    gameModel.findOne({_id: gameId}, function(err, doc) {
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
};

/**
 * Tests that if a user's the last user to act at the end of a level,
 * that we've opted her into the proper end-level opt in path, 
 * that we've opted the group into the proper group end-level message, 
 * and that we've opted the group into the proper next-level start message. 
 * Note that this function requires a this.gameController to be defined in the test 
 * file it is called in. (i.e., this.gameController = new SGCompetitiveStoryController(app)).
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
 * @param endGameGroupMessageFormat
    The format of the message, sent at the end of the game, containing group feedback. 
 * @param endGameGroupMessage
 *  The OIP of the endgame group message. 
 * @param endGameIndivMessageFormat
    The format of the message, sent at the end of the game, containing unique individual feedback. 
 * @param expectEndGameIndividualMessage
 *  The OIP of the endgame individual message. 
 */

exports.userActionTest = function() {
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

    expectEndGameGroupMessageFormat: function(endGameGroupMessageFormat) {
      this.endGameGroupMessageFormat = endGameGroupMessageFormat;
      return this;
    },
    expectEndGameGroupMessage: function(endGameGroupMessage) {
      this.endGameGroupMessage = endGameGroupMessage;
      return this;
    },

    expectEndGameIndividualMessageFormat: function(endGameIndivMessageFormat) {
      this.endGameIndivMessageFormat = endGameIndivMessageFormat;
      return this;
    },
    expectEndGameIndividualMessage: function(endGameIndivMessage) {
      this.endGameIndivMessage = endGameIndivMessage;
      return this;
    },

    exec: function() {
      var request;
      var self = this;
      before(function() {
        phone = smsHelper.getNormalizedPhone(self.phone);
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
        this.gameController.userAction(request, response);
      })


      it('should move user to level ' + this.nextLevelName + ' (optin path: ' + this.nextLevelMessage + ') in the game doc', function(done) {

        gameModel.findOne({_id: gameId}, function(err, doc) {
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
          gameModel.findOne({_id: gameId}, function(err, doc) {
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

      // If supplied the arguments, test for the message which moves all players
      // to the next level. 
      if (this.nextStageName && this.nextStageMessage) {
        it('should move all players to ' + this.nextStageName, function(done) {
          gameModel.findOne({_id: gameId}, function(err, doc) {
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

      var checkIfAllPlayersReceivedMessage = function(playerPhoneObject, totalNumberOfPlayers) {
        var numberPlayersReceivedMessage = 0;
        for (phone in playerPhoneObject) {
          if (playerPhoneObject.hasOwnProperty(phone) && playerPhoneObject[phone] === true) {
            numberPlayersReceivedMessage ++;
          }
        }
        if (numberPlayersReceivedMessage == totalNumberOfPlayers) {
          return true;
        }
        return false;
      }

      // If supplied the arguments, test for the end-game message sent to all 
      // members of the group. 
      if (this.endGameGroupMessageFormat && this.endGameGroupMessage) {
        it('it should send the endgame group message with the format of ' + this.endGameGroupMessageFormat + ' (optin path: ' + this.endGameGroupMessage + ') to all players.', function(done) {

          gameModel.findOne({_id: gameId}, function(err, doc) {
            var playersCurrentStatus = doc.players_current_status
            var storyResults = doc.story_results;
            var allPlayersReceivedMessage = false;

            var playerPhoneObject = {}
            for (var i = 0; i < playersCurrentStatus.length; i++) {
              playerPhoneObject[playersCurrentStatus[i].phone] = false;
            }

            for (var i = 0; i < playersCurrentStatus.length; i++) {
              if (playersCurrentStatus[i].opt_in_path == self.endGameGroupMessage) {
                playerPhoneObject[playersCurrentStatus[i].phone] = true;
              }
            }

            // Checking to see if all players have received the message. If false, reset playerPhoneObject.
            if (checkIfAllPlayersReceivedMessage(playerPhoneObject, playersCurrentStatus.length)) {
              allPlayersReceivedMessage = true; 
            } else {
              for (phone in playerPhoneObject) {
                if (playerPhoneObject.hasOwnProperty(phone)) {
                  playerPhoneObject[phone] = false;
                }
              }
            }

            if (!allPlayersReceivedMessage) {
              for (var i = 0; i < storyResults.length; i++) {
                if (storyResults[i].oip == self.endGameGroupMessage) {
                  playerPhoneObject[storyResults[i].phone] = true;
                }
              }
            }

            if (checkIfAllPlayersReceivedMessage(playerPhoneObject, playersCurrentStatus.length)) {
              allPlayersReceivedMessage = true; 
            }

            if (allPlayersReceivedMessage) {
              done();
            } 
            else {
              assert(false);
            }
          }) 
        })
      }

      // If supplied the arguments, test for the end-game message unique to 
      // individual users. 
      if (this.endGameIndivMessageFormat && this.endGameIndivMessage) {
        it('it should send the endgame unique individual message with the format of ' + this.endGameIndivMessageFormat + ' (optin path: ' + this.endGameIndivMessage + ') to all players, since we\'ve configured tests to have all players produce the same input.', function(done) {
          gameModel.findOne({_id: gameId}, function(err, doc) {
            var playersCurrentStatus = doc.players_current_status
            var storyResults = doc.story_results;

            var playerPhoneObject = {}
            for (var i = 0; i < playersCurrentStatus.length; i++) {
              playerPhoneObject[playersCurrentStatus[i].phone] = false;
            }

            var allPlayersReceivedMessage = false;

            for (var i = 0; i < playersCurrentStatus.length; i++) {
              if (playersCurrentStatus[i].opt_in_path == self.endGameIndivMessage) {
                playerPhoneObject[playersCurrentStatus[i].phone] = true;
              }
            }

            // Checking to see if all players have received the message. If false, reset playerPhoneObject.
            if (checkIfAllPlayersReceivedMessage(playerPhoneObject, playersCurrentStatus.length)) {
              allPlayersReceivedMessage = true; 
            } else {
              for (phone in playerPhoneObject) {
                if (playerPhoneObject.hasOwnProperty(phone)) {
                  playerPhoneObject[phone] = false;
                }
              }
            }

            if (!allPlayersReceivedMessage) {
              for (var i = 0; i < storyResults.length; i++) {
                if (storyResults[i].oip == self.endGameIndivMessage) {
                  playerPhoneObject[storyResults[i].phone] = true;
                }
              }
            }

            if (checkIfAllPlayersReceivedMessage(playerPhoneObject, playersCurrentStatus.length)) {
              allPlayersReceivedMessage = true; 
            }

            if (allPlayersReceivedMessage) {
              done();
            } 
            else {
              assert(false);
            }
          })
        })
      }
    }
  }
}
