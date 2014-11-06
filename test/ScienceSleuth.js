var assert = require('assert')
  , express = require('express')
  , emitter = require('../app/eventEmitter')
  , messageHelper = require('../app/lib/userMessageHelpers')
  , SGCompetitiveStoryController = require('../app/controllers/SGCompetitiveStoryController')
  ;

describe('Science Sleuth game being played:', function() {
  var alphaName = 'alpha';
  var alphaPhone = '5555550200';
  var betaName0 = 'friend0';
  var betaName1 = 'friend1';
  var betaName2 = 'friend2';
  var betaPhone0 = '5555550201';
  var betaPhone1 = '5555550202';
  var betaPhone2 = '5555550203';
  var storyId = 101;

  before('instantiating Express app, game controller, game config, dummy response', function() {
    var app = express();
    require('../app/config')(app, express);

    this.gameController = new SGCompetitiveStoryController(app);

    // Reassigning the this.gameConfig property of the controller we just
    // instantiated to use our test config file. 
    this.gameController.gameConfig = require('../app/config/competitive-stories');
    // Because of the unique scope of the before() hook, 
    // the variables below weren't actually used/reassigned in testing. 
    // var gameId = 2;
    // var gameMappingId = 2;

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

    it('should have a sg_competitivestory_game document with Science Sleuth\'s story_id of 101', function(done) {
      this.gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
        if (!err && doc.story_id == 101) { done(); }
        else { assert(false); }
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