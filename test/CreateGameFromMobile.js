var assert = require('assert')
  , express = require('express')
  , emitter = rootRequire('app/eventEmitter')
  , connectionOperations = rootRequire('config/connectionOperations')
  , gameCreateConfigModel = rootRequire('app/sms-games/models/sgGameCreateConfig')(connectionOperations)
  , gameModel = rootRequire('app/sms-games/models/sgCompetitiveStory')(connectionOperations)
  , SGCreateFromMobileController = rootRequire('app/sms-games/controllers/SGCreateFromMobileController')
  , smsHelper = rootRequire('app/smsHelpers')
  , _ = require('underscore')
  ;

var mobileController = new SGCreateFromMobileController
  , storyId = 301
  , gameCreateConfigId
  , storyType = 'competitive-story'
  , gameConfig = app.getConfig(app.ConfigName.COMPETITIVE_STORIES, storyId)
  , alphaName = 'Leonardo'
  , alphaPhone = '15555555551'
  , betaName0 = 'Raphael'
  , betaPhone0 = '15555555552'
  , betaName1 = 'Donatello'
  , betaPhone1 = '15555555553'
  , betaName2 = 'Michelangelo'
  , betaPhone2 = '15555555554'
  , response = {
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
    }
  ;

describe('Creating a four-player game with first names from mobile: ', function() {
  describe('Starting a new game: ', function() {
    it(alphaName + ' begins the flow by texting in her first name.', function(done) {
      var request = {
        query: {
          story_id: storyId,
          story_type: storyType,
          alpha_first_name_query_response: true
        },
        body: {
          phone: alphaPhone,
          args: alphaName
        }
      }

      emitter.on('game-create-config-created', function(doc) {
        gameCreateConfigId = doc._id;
        done();
        emitter.removeAllListeners('game-create-config-created');
      })
      mobileController.processRequest(request, response);
    })

    it('should create a game-create-config doc when the alpha texts in her first name, and update that doc with the alpha\'s first name', function(done) {
      gameCreateConfigModel.findOne({_id: gameCreateConfigId}, function(err, doc) {
        if (!err && doc.alpha_mobile === alphaPhone && doc.alpha_first_name === alphaName) { done(); }
        else { assert(false); } 
      })
    })
  })

  describe(alphaName + ' texts in ' + betaName0 + ' along with that player\'s phone number', function() {
    var request = {
      query: {
        story_id: storyId,
        story_type: storyType
      },
      body: {
        phone: alphaPhone,
        args: betaName0 + betaPhone0
      }
    }
    it('should create a game-create-config doc updated with ' + betaName0 + '\'s name and number', function(done) {
      emitter.on('game-create-config-modified', function(doc) {
        gameCreateConfigModel.findOne({_id: gameCreateConfigId}, function(err, doc) {
          if (!err && doc.beta_mobile_0 === betaPhone0 && doc.beta_first_name_0 === betaName0) { done(); }
          else { assert(false); }
        })
        emitter.removeAllListeners('game-create-config-modified');
      })
      mobileController.processRequest(request, response);
    })
  })

  describe(alphaName + ' texts in ' + betaPhone1 + ' along with that player\'s phone number', function() {
    var request = {
      query: {
        story_id: storyId,
        story_type: storyType
      },
      body: {
        phone: alphaPhone,
        args: betaName1 + betaPhone1
      }
    }
    it('should create a game-create-config doc updated with ' + betaName1 + '\'s name and number', function(done) {
      emitter.on('game-create-config-modified', function(doc) {
        gameCreateConfigModel.findOne({_id: gameCreateConfigId}, function(err, doc) {
          if (!err && doc.beta_mobile_1 === betaPhone1 && doc.beta_first_name_1 === betaName1) { done(); }
          else { assert(false); }
        })
        emitter.removeAllListeners('game-create-config-modified');
      })
      mobileController.processRequest(request, response);
    })
  })

  describe(alphaName + ' texts in ' + betaName2 + ' along with that player\'s phone number and game should be created with standard sg_competitivestory_games doc', function() {
    var request = {
      query: {
        story_id: storyId,
        story_type: storyType
      },
      body: {
        phone: alphaPhone,
        args: betaName2 + betaPhone2
      }
    }
    it('should create an sg_competitivestory_games doc for the four players', function(done) {
      emitter.on('mobile-create-flow-creating-game', function(doc) {
        if (
          doc.alpha_mobile === alphaPhone &&
          doc.beta_mobile_0 === betaPhone0 &&
          doc.beta_mobile_1 === betaPhone1 && 
          doc.beta_mobile_2 === betaPhone2 &&
          doc.alpha_first_name === alphaName && 
          doc.beta_first_name_0 === betaName0 &&
          doc.beta_first_name_1 === betaName1 &&
          doc.beta_first_name_2 === betaName2
        ) {
          done();
        }
        else {
          assert(false);
        }
        emitter.removeAllListeners('mobile-create-flow-creating-game');
      })
      mobileController.processRequest(request, response);
    })

  })
  after(function() {
    gameCreateConfigModel.remove({_id: gameCreateConfigId}, function() {});
  })
})

describe('Alpha creating a game through mobile after only inviting one player', function() {
  describe(alphaName + ' beginning a mobile create flow' , function() {
    var request = {
      query: {
        story_id: storyId,
        story_type: storyType,
        alpha_first_name_query_response: true
      },
      body: {
        phone: alphaPhone,
        args: alphaName
      }
    }
    it('should create a game-create-config game doc', function(done) {
      emitter.on('game-create-config-created', function(doc) {
        gameCreateConfigId = doc._id;
        done();
        emitter.removeAllListeners('game-create-config-created');
      })
      mobileController.processRequest(request, response);
    })
  })

  describe(alphaName + ' inviting one beta', function() {
    var request = {
      query: {
        story_id: storyId,
        story_type: storyType
      },
      body: {
        phone: alphaPhone,
        args: betaName0 + betaPhone0
      }
    }
    it('should update the game-create-config game doc', function(done) {
      emitter.on('game-create-config-modified', function(doc) {
        if (doc.beta_mobile_0 == betaPhone0 && doc.beta_first_name_0 == betaName0) {
          done();
        }
        else {
          assert(false);
        }
        emitter.removeAllListeners('game-create-config-modified');
      })
      mobileController.processRequest(request, response);
    })
  })

  describe(alphaName + ' texting back "Y" ', function(done) {
    var request = {
      query: {
        story_id: storyId,
        story_type: storyType
      },
      body: {
        phone: alphaPhone,
        args: 'Y'
      }
    }
    it('successfully creates a game with only two players', function(done) {
      emitter.on('mobile-create-flow-creating-game', function(doc) {
        if (
          doc.alpha_mobile == alphaPhone &&
          doc.alpha_first_name == alphaName &&
          doc.beta_mobile_0 == betaPhone0 &&
          doc.beta_first_name_0 == betaName0 && 
          !doc.beta_mobile_1 &&
          !doc.beta_first_name_1 &&
          !doc.beta_mobile_2 &&
          !doc.beta_first_name_2
        ) {
          done();
        }
        else {
          assert(false);
        }
        emitter.removeAllListeners('mobile-create-flow-creating-game');
      })
      mobileController.processRequest(request, response);
    })
  })
  after(function() {
    gameCreateConfigModel.remove({_id: gameCreateConfigId}, function() {});
  })
})

// test a game creation process where the player first enter invalid params for 1) alpha name, 2) beta 0 name, and 3) beta 0 number.
describe('Mobile-create-flow sends appropriate error messages', function() {
  describe(alphaName + ' beginning a mobile create flow and entering a number, not a name', function() {
    var request = {
      query: {
        story_id: storyId,
        story_type: storyType,
        alpha_first_name_query_response: true
      },
      body: {
        phone: alphaPhone,
        args: alphaPhone
      }
    }
    it('sends the alpha an error message', function(done) {
      emitter.on(emitter.events.mcOptinTest, function(payload) {
        if (payload.form.opt_in_path == gameConfig.mobile_create.invalid_alpha_first_name_oip) {
          done();
        }
        else {
          assert(false);
        }
        emitter.removeAllListeners(emitter.events.mcOptinTest);
      })
      mobileController.processRequest(request, response);
    })
  })

  describe(alphaName + ' texts in her correct first name', function() {
    var request = {
      query: {
        story_id: storyId,
        story_type: storyType,
        alpha_first_name_query_response: true
      },
      body: {
        phone: alphaPhone,
        args: alphaName
      }
    }
    it('should create the game-create-config game doc', function(done) {

      emitter.on('game-create-config-created', function(doc) {
        gameCreateConfigId = doc._id;

        if (doc.alpha_first_name == alphaName && doc.alpha_first_name == alphaName) {
          done();
        }
        else {
          assert(false);
        }
        emitter.removeAllListeners('game-create-config-created');
      })

      mobileController.processRequest(request, response);
    })
  })

  describe(alphaName + ' attempts to start the game without other players', function() {
    var request = {
      query: {
        story_id: storyId,
        story_type: storyType
      },
      body: {
        phone: alphaPhone,
        args: 'Y'
      }
    }

    it('should send her the "not_enough_players_oip"', function(done) {
      emitter.on(emitter.events.mcOptinTest, function(payload) {
        if (payload.form.opt_in_path == gameConfig.mobile_create.not_enough_players_oip) {
          done();
        }
        else {
          assert(false);
        }
        emitter.removeAllListeners(emitter.events.mcOptinTest);
      })
      mobileController.processRequest(request, response);
    })
  })

  describe(alphaName + ' texts in a beta name without a valid number', function() {
    var request = {
      query: {
        story_id: storyId,
        story_type: storyType
      },
      body: {
        phone: alphaPhone,
        args: betaName0
      }
    }

    it('should send the alpha the "invalid_mobile_oip" message', function() {
      emitter.on(emitter.events.mcOptinTest, function(payload) {
        if (payload.form.opt_in_path == gameConfig.mobile_create.invalid_mobile_oip) {
          done();
        }
        else {
          assert(false);
        }
        emitter.removeAllListeners(emitter.events.mcOptinTest);
      })
      mobileController.processRequest(request, response);
    })
  })

  describe(alphaName + ' texts in a beta name without a valid name', function() {
    var request = {
      query: {
        story_id: storyId,
        story_type: storyType
      },
      body: {
        phone: alphaPhone,
        args: betaPhone0
      }
    }

    it('should send the alpha the "invalid_mobile_oip" message', function() {
      emitter.on(emitter.events.mcOptinTest, function(payload) {
        if (payload.form.opt_in_path == gameConfig.mobile_create.invalid_mobile_oip) {
          done();
        }
        else {
          assert(false);
        }
        emitter.removeAllListeners(emitter.events.mcOptinTest);
      })
      mobileController.processRequest(request, response);
    })
  })

  after(function() {
    gameCreateConfigModel.remove({_id: gameCreateConfigId}, function() {});
  })
})