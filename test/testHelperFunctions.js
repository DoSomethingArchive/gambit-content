var assert = require('assert')
 , emitter = require('../app/eventEmitter')
 , messageHelper = require('../app/lib/userMessageHelpers')
 ;


/**
 * Tests that if a user's the last user to act at the end of a level,
 * that we've opted her into the proper end-level opt in path, 
 * that we've opted the group into the proper group end-level message, 
 * and that we've opted the group into the proper next-level start message. 
 * Note that this function requires a gameController to be defined in the test 
 * file it is called in. (i.e., gameController = new SGCompetitiveStoryController(app)).
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