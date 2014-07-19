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
      alphaName = 'alpha';
      alphaPhone = '5555550100';
      betaName0 = 'friend0';
      betaName1 = 'friend1';
      betaName2 = 'friend2';
      betaPhone0 = '5555550101';
      betaPhone1 = '5555550102';
      betaPhone2 = '5555550103';
      request = {
        body: {
          story_id: 1,
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
        if (!err && docs.length > 0)
          done();
        else
          assert(false);
      })
    })

    it('should add sg_user doc for beta0 user', function(done) {
      var phone = gameController.getNormalizedPhone(betaPhone0);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0)
          done();
        else
          assert(false);
      })
    })

    it('should add sg_user doc for beta1 user', function(done) {
      var phone = gameController.getNormalizedPhone(betaPhone1);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0)
          done();
        else
          assert(false);
      })
    })

    it('should add sg_user doc for beta2 user', function(done) {
      var phone = gameController.getNormalizedPhone(betaPhone2);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0)
          done();
        else
          assert(false);
      })
    })

    it('should add a sg_gamemapping document', function(done) {
      gameController.gameMappingModel.find({_id: gameMappingId}, function(err, docs) {
        if (!err && docs.length > 0)
          done();
        else
          assert(false);
      })
    })

    it('should add a sg_competitivestory_game document', function(done) {
      gameController.gameModel.find({_id: gameId}, function(err, docs) {
        if (!err && docs.length > 0)
          done();
        else
          assert(false);
      })
    })
  })

  describe('Beta 1 joining the game', function() {
    it('should update the game document')
    it('should send a Mobile Commons opt-in to Beta 1')
    it('should send a Mobile Commons opt-in to Alpha')
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