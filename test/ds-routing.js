/**
 * Tests for ds-routing library.
 */

var assert = require('assert')
  , path = require('path')
  , express = require('express')
  , emitter = require('../app/eventEmitter')
  ;

// Setting appRoot for tests
global.appRoot = path.resolve('./');

var MCRouting = require(appRoot + '/app/lib/ds-routing/controllers/MCRouting')
  , Tips = require(appRoot + '/app/lib/ds-routing/controllers/Tips')
  ;

describe('MCRouting tests', function() {
  var app = express();
  require(appRoot + '/app/config')(app, express);

  var mcRouting = new MCRouting(app);
  var tips = new Tips(app);

  // Dummy Express response object.
  var response = {
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
    }
  };


  /**
   * yes-no-gateway tests
   */
  describe('POST to yes-no-gateway with opt_in_path_id=166253, args=yes', function() {
    it('should optin user to 165419', function(done) {
      var test = {
        body: {
          phone: 15555550100,
          opt_in_path_id: 166253,
          args: 'yes'
        }
      };

      emitter.on(emitter.events.mcOptinTest, function(payload) {
        emitter.removeAllListeners(emitter.events.mcOptinTest);

        if (payload.form.opt_in_path == 165419) {
          done();
        }
        else {
          assert(false, 'Failed yes-no-gateway test. Received incorrect optin path.');
        }
      });

      mcRouting.yesNoGateway(test, response);
    });
  });

  describe('POST to yes-no-gateway with opt_in_path_id=166253, args=no', function() {
    it('should optin user to 165417', function(done) {
      var test = {
        body: {
          phone: 15555550100,
          opt_in_path_id: 166253,
          args: 'no'
        }
      };

      emitter.on(emitter.events.mcOptinTest, function(payload) {
        emitter.removeAllListeners(emitter.events.mcOptinTest);

        if (payload.form.opt_in_path == 165417) {
          done();
        }
        else {
          assert(false, 'Failed yes-no-gateway test. Received incorrect optin path.');
        }
      });

      mcRouting.yesNoGateway(test, response);
    });
  });


  /**
   * start-campaign-gate tests
   */
  describe('POST to start-campaign-gate with mdata_id=11493', function() {
    it('should optin to 170139, optout of 128005', function(done) {
      var test = {
        body: {
          phone: 15555550100,
          mdata_id: 11493
        }
      };

      var optinReceived = false
        , optoutReceived = false
        ;

      emitter.on(emitter.events.mcOptinTest, function(payload) {
        emitter.removeAllListeners(emitter.events.mcOptinTest);
        optinReceived = true;

        if (payload.form.opt_in_path != 170139) {
          assert(false, 'Failed start-campaign-gate with incorrect optin path. '
            + 'Returned: ' + payload.form.optin_in_path);
        }

        if (optinReceived && optoutReceived) {
          done();
        }
      });
      
      emitter.on(emitter.events.mcOptoutTest, function(payload) {
        emitter.removeAllListeners(emitter.events.mcOptoutTest);
        optoutReceived = true;

        if (payload.form.campaign != 128005) {
          assert(false, 'Failed start-campaign-gate with incorrect optout id. '
            + 'Returned: ' + payload.form.campaign);
        }

        if (optinReceived && optoutReceived) {
          done();
        }
      });

      mcRouting.startCampaignGate(test, response);
    });
  });


  /**
   * handle-start-campaign-response tests
   */
  describe('POST to handle-start-campaign-response from 167209', function() {
    before(function() {
      tips.tipModel.remove({phone: '15555550100'}, function() {});
    });

    describe('Texting "KNOW"', function() {
      it('should optin user to a KNOW path', function(done) {
        var test = {
          body: {
            phone: 15555550100,
            opt_in_path_id: 167209,
            args: 'KNOW'
          }
        };

        emitter.on(emitter.events.mcOptinTest, function(payload) {
          emitter.removeAllListeners(emitter.events.mcOptinTest);

          var expected = tips.config.tips['10673'].optins;
          if (expected.indexOf(payload.form.opt_in_path) >= 0) {
            done();
          }
          else {
            assert(false);
          }
        });

        mcRouting.handleStartCampaignResponse(test, response);
      });
    });

    describe('Texting "PLAN"', function() {
      it('should optin user to a PLAN path', function(done) {
        var test = {
          body: {
            phone: 15555550100,
            opt_in_path_id: 167209,
            args: 'PLAN'
          }
        };

        emitter.on(emitter.events.mcOptinTest, function(payload) {
          emitter.removeAllListeners(emitter.events.mcOptinTest);

          var expected = tips.config.tips['10663'].optins;
          if (expected.indexOf(payload.form.opt_in_path) >= 0) {
            done();
          }
          else {
            assert(false);
          }
        });

        mcRouting.handleStartCampaignResponse(test, response);
      });
    });

    describe('Texting "DO"', function() {
      it('should optin user to a DO path', function(done) {
        var test = {
          body: {
            phone: 15555550100,
            opt_in_path_id: 167209,
            args: 'DO'
          }
        };

        emitter.on(emitter.events.mcOptinTest, function(payload) {
          emitter.removeAllListeners(emitter.events.mcOptinTest);

          var expected = tips.config.tips['10243'].optins;
          if (expected.indexOf(payload.form.opt_in_path) >= 0) {
            done();
          }
          else {
            assert(false);
          }
        });

        mcRouting.handleStartCampaignResponse(test, response);
      });
    });

    describe('Texting "PROVE"', function() {
      it('should optin user to the PROVE path', function(done) {
        var test = {
          body: {
            phone: 15555550100,
            opt_in_path_id: 167209,
            args: 'PROVE'
          }
        };

        emitter.on(emitter.events.mcOptinTest, function(payload) {
          emitter.removeAllListeners(emitter.events.mcOptinTest);

          if (payload.form.opt_in_path == 167259) {
            done();
          }
          else {
            assert(false);
          }
        });

        mcRouting.handleStartCampaignResponse(test, response);
      });
    });

    after(function() {
      tips.tipModel.remove({phone: '15555550100'}, function() {});
    });
  });

});
