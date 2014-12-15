/**
 * Tests for ds-routing library.
 */

var assert = require('assert')
  , express = require('express')
  , emitter = rootRequire('app/eventEmitter')
  , connectionOperations = rootRequire('app/config/connectionOperations')
  ;

describe('ds-routing tests', function() {
  var MCRouting = rootRequire('app/lib/ds-routing/controllers/MCRouting')
    , Tips = rootRequire('app/lib/ds-routing/controllers/Tips')
    , tipModel = rootRequire('app/lib/ds-routing/models/tip')(connectionOperations)
    ;
    
  var mcRouting = new MCRouting;
  var tips = new Tips;
  // tips.config = rootRequire('app/lib/ds-routing/config/tips-config')

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

  // Helper to remove a test user's `tip` document.
  var resetUserTipDoc = function() {
    tipModel.remove({phone: '15555550100'}, function() {});
  };


  /**
   * yes-no-gateway tests
   */
  describe('Call to yesNoGateway with opt_in_path_id=166253, args=yes', function() {
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

  describe('Call to yesNoGateway with opt_in_path_id=166253, args=no', function() {
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
   * campaign-transition tests
   */
  describe('Call to campaignTransition with mdata_id=11493', function() {
    before(function() {
      process.env.MOBILECOMMONS_COMPANY_KEY = 'MOBILECOMMONS_COMPANY_KEY';
      process.env.MOBILECOMMONS_AUTH_EMAIL = 'MOBILECOMMONS_AUTH_EMAIL';
      process.env.MOBILECOMMONS_AUTH_PASS = 'MOBILECOMMONS_AUTH_PASS';
    });

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
          assert(false, 'Failed campaign-transition with incorrect optin path. '
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
          assert(false, 'Failed campaign-transition with incorrect optout id. '
            + 'Returned: ' + payload.form.campaign);
        }

        if (optinReceived && optoutReceived) {
          done();
        }
      });

      mcRouting.campaignTransition(test, response);
    });

    after(function() {
      process.env.MOBILECOMMONS_COMPANY_KEY = undefined;
      process.env.MOBILECOMMONS_AUTH_EMAIL = undefined;
      process.env.MOBILECOMMONS_AUTH_PASS = undefined;
    });
  });


  /**
   * handle-start-campaign-response tests
   */
  describe('Call to handleStartCampaignResponse from 167209', function() {
    before(resetUserTipDoc);

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

          var expected = app.getConfig('tips_config', 10673).optins;
          console.log('****expected', expected)
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

          var expected = app.getConfig('tips_config', 10663).optins;
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

          var expected = app.getConfig('tips_config', 10243).optins;
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

    after(resetUserTipDoc);
  });


  /**
   * Tips tests
   */
   describe('Call to deliverTips with mdata_id=9521', function() {
    before(resetUserTipDoc);

    it('should optin user to a correct optin path', function(done) {
      var test = {
        body: {
          phone: 15555550100,
          mdata_id: 9521
        }
      };

      emitter.on(emitter.events.mcOptinTest, function(payload) {
        emitter.removeAllListeners(emitter.events.mcOptinTest);

        var expected = app.getConfig('tips_config', 9521).optins;
        if (expected.indexOf(payload.form.opt_in_path) >= 0) {
          done();
        }
        else {
          assert(false);
        }
      });

      tips.deliverTips(test, response);
    });

    after(resetUserTipDoc);
   });

});
