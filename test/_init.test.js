// Wrapper around require to set relative path at app root
global.rootRequire = function(name) {
  var path = require('path');
  var rootDir = path.resolve('./');
  return require(rootDir + '/' + name);
}

var express = require('express');
app = express();
rootRequire('app/config')();

require('./BullyText.js');
require('./ds-routing.js');
require('./EndGameFromUserExit.js');
require('./GameAlphaStart');
require('./lib.test.js');
require('./mobilecommons.js');
require('./ScienceSleuth.js');
