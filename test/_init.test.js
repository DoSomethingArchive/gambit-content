// Wrapper around require to set relative path at app root
global.rootRequire = function(name) {
  var path = require('path');
  var rootDir = path.resolve('./');
  return require(rootDir + '/' + name);
}

describe('Running all responder tests', function() {
  var express = require('express');
  app = express();

  var appConfig = rootRequire('app/config')()
    , smsConfigsLoader = rootRequire('app/config/smsConfigsLoader');

  it('loads the sms configuration documents into memory from the database', function(done) {
    smsConfigsLoader(function() {
      done();
    });
  });

  it('runs all the responder tests', function() {
    require('./BullyText2014.js');
    require('./ds-routing.js');
    require('./EndGameFromUserExit.js');
    require('./GameAlphaStart');
    require('./lib.test.js');
    require('./mobilecommons.js');
    require('./ScienceSleuth.js');
    require('./PlayerNamesInGame.js');
    require('./CreateGameFromMobile.js');
  })
});