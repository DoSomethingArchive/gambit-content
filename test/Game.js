var assert = require('assert')
  , express = require('express')
  , emitter = require('../app/eventEmitter')
  , SGCompetitiveStoryController = require('../app/controllers/SGCompetitiveStoryController')
  ;

describe('End-to-end game playthrough:', function() {
  before(function() {
    app = express();
    require('../app/config')(app, express);

    gameController = new SGCompetitiveStoryController(app);
    gameId = 0;
    gameMappingId = 0;
  })

  describe('Creating a Competitive Story game', function() {
    before(function() {
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

      // Test request object to create the game.
      request = {
        body: {
          story_id: 1,
          person: {
            first_name: 'alpha',
            phone: '5555550100'
          },
          friends: [
            {
              first_name: 'friend0',
              phone: '5555550101'
            },
            {
              first_name: 'friend1',
              phone: '5555550102'
            },
            {
              first_name: 'friend2',
              phone: '5555550103'
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
      gameController.createGame(request, response);
    })

    it('should add sg_user documents for all users')
    it('should add a sg_competitivestory_game document')
    it('should add a sg_gamemapping document')
  })

  describe('Beta 1 joining the game', function() {
    it('should update the game document')
    it('should send a Mobile Commons opt-in to Beta 1')
    it('should send a Mobile Commons opt-in to Alpha')
  })

  after(function() {
      // Remove all test documents
      gameController.userModel.remove({phone: '15555550100'}, function() {});
      gameController.userModel.remove({phone: '15555550101'}, function() {});
      gameController.userModel.remove({phone: '15555550102'}, function() {});
      gameController.userModel.remove({phone: '15555550103'}, function() {});
      gameController.gameMappingModel.remove({_id: gameMappingId}, function() {});
      gameController.gameModel.remove({_id: gameId}, function() {});
    })
});