/**
 * Tests for the app-specific mobilecommons library.
 */

var assert = require('assert')
  , mobilecommons = rootRequire('mobilecommons')
  , emitter = rootRequire('app/eventEmitter')
  ;

var setMobileCommonsTestCredentials = function() {
  process.env.MOBILECOMMONS_COMPANY_KEY = 'MOBILECOMMONS_COMPANY_KEY';
  process.env.MOBILECOMMONS_AUTH_EMAIL = 'MOBILECOMMONS_AUTH_EMAIL';
  process.env.MOBILECOMMONS_AUTH_PASS = 'MOBILECOMMONS_AUTH_PASS';
};

var unsetMobileCommonsTestCredentials = function() {
  process.env.MOBILECOMMONS_COMPANY_KEY = undefined;
  process.env.MOBILECOMMONS_AUTH_EMAIL = undefined;
  process.env.MOBILECOMMONS_AUTH_PASS = undefined;
};

describe('mobilecommons.optin with just an Alpha', function() {
  it('should emit optin event with correct payload', function(done) {
    var test = {
      alphaPhone: 5555550100,
      alphaOptin: 123
    };
    var expected = {
      form: {
        opt_in_path: 123,
        'person[phone]': 5555550100
      }
    };

    emitter.on(emitter.events.mcOptinTest, function(payload) {
      emitter.removeAllListeners(emitter.events.mcOptinTest);

      if (JSON.stringify(payload) == JSON.stringify(expected)) {
        done();
      }
      else {
        assert(false, "Actual payload doesn't match what's expected.");
      }
    });

    mobilecommons.optin(test);
  })
});

describe('mobilecommons.optin with an Alpha and 1 Beta', function() {
  it('should emit optin event with correct payload', function(done) {
    var test = {
      alphaPhone: 5555550100,
      alphaOptin: 123,
      betaPhone: 5555550101,
      betaOptin: 456
    };
    var expected = {
      form: {
        opt_in_path: 123,
        friends_opt_in_path: 456,
        'person[phone]': 5555550100,
        'friends[]': 5555550101
      }
    };

    emitter.on(emitter.events.mcOptinTest, function(payload) {
      emitter.removeAllListeners(emitter.events.mcOptinTest);

      if (JSON.stringify(payload) == JSON.stringify(expected)) {
        done();
      }
      else {
        assert(false, "Actual payload doesn't match what's expected.");
      }
    });

    mobilecommons.optin(test);
  })
});

describe('mobilecommons.optin with Alpha and 2 Betas', function() {
  it('should emit optin event with correct payload', function(done) {
    var test = {
      alphaPhone: 5555550100,
      alphaOptin: 123,
      betaPhone: [5555550101, 5555550102],
      betaOptin: 456
    };
    var expected = {
      form: {
        opt_in_path: 123,
        friends_opt_in_path: 456,
        'person[phone]': 5555550100,
        'friends[0]': 5555550101,
        'friends[1]': 5555550102,
      }
    };

    emitter.on(emitter.events.mcOptinTest, function(payload) {
      emitter.removeAllListeners(emitter.events.mcOptinTest);

      if (JSON.stringify(payload) == JSON.stringify(expected)) {
        done();
      }
      else {
        assert(false, "Actual payload doesn't match what's expected.");
      }
    });

    mobilecommons.optin(test);
  })
});

describe('mobilecommons.optout', function() {
  before(setMobileCommonsTestCredentials);

  it('should emit optout event with correct payload', function(done) {
    var test = {
      phone: 5555550100,
      campaignId: 123
    };
    var expected = {
      auth: {
        user: 'MOBILECOMMONS_AUTH_EMAIL',
        pass: 'MOBILECOMMONS_AUTH_PASS'
      },
      form: {
        'person[phone]': 5555550100,
        campaign: 123,
        company_key: 'MOBILECOMMONS_COMPANY_KEY'
      }
    };

    emitter.on(emitter.events.mcOptoutTest, function(payload) {
      emitter.removeAllListeners(emitter.events.mcOptoutTest);

      if (JSON.stringify(payload) == JSON.stringify(expected)) {
        done();
      }
      else {
        assert(false, "Actual payload doesn't match what's expected.");
      }
    });

    mobilecommons.optout(test);
  });

  after(unsetMobileCommonsTestCredentials);
});

describe('mobilecommons.profile_update', function() {
  before(setMobileCommonsTestCredentials); 

  it('should emit profile_update event with correct payload', function(done) {
    var test = {
      phone: 5555550100,
      optInPathId: 123
    };
    var expected = {
      auth: {
        user: 'MOBILECOMMONS_AUTH_EMAIL',
        pass: 'MOBILECOMMONS_AUTH_PASS'
      },
      form: {
        phone_number: 5555550100,
        opt_in_path_id: 123
      }
    };

    emitter.on(emitter.events.mcProfileUpdateTest, function(payload) {
      emitter.removeAllListeners(emitter.events.mcProfileUpdateTest);

      if (JSON.stringify(payload) == JSON.stringify(expected)) {
        done();
      }
      else {
        assert(false, "Actual payload doesn't match what's expected.");
      }
    });

    mobilecommons.profile_update(test.phone, test.optInPathId);
  });

  after(unsetMobileCommonsTestCredentials);
});

describe('mobilecommons.profile_update with custom fields', function() {
  before(setMobileCommonsTestCredentials);

  it('should emit profile_update event with correct payload', function(done) {
    var test = {
      phone: 5555550100,
      optInPathId: 123,
      customFields: {
        field1: 1,
        field2: 'abc'
      }
    };
    var expected = {
      auth: {
        user: 'MOBILECOMMONS_AUTH_EMAIL',
        pass: 'MOBILECOMMONS_AUTH_PASS'
      },
      form: {
        phone_number: 5555550100,
        opt_in_path_id: 123,
        field1: 1,
        field2: 'abc'
      }
    };

    emitter.on(emitter.events.mcProfileUpdateTest, function(payload) {
      emitter.removeAllListeners(emitter.events.mcProfileUpdateTest);

      if (JSON.stringify(payload) == JSON.stringify(expected)) {
        done();
      }
      else {
        assert(false, "Actual payload doesn't match what's expected.");
      }
    });

    mobilecommons.profile_update(test.phone, test.optInPathId, test.customFields);
  });

  after(unsetMobileCommonsTestCredentials);
});
