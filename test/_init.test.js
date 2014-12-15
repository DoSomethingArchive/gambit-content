// Wrapper around require to set relative path at app root
global.rootRequire = function(name) {
  var path = require('path');
  var rootDir = path.resolve('./');
  return require(rootDir + '/' + name);
}

console.log('**** hoisdf')


describe('Running all responder tests', function() {
  // before(function () {
    var express = require('express');
    app = express();
    // console.log('***app object', JSON.stringify(app))

    var appConfig = rootRequire('app/config')()
      , smsConfigsLoader = rootRequire('app/config/smsConfigsLoader')

    // app.getConfig = function(modelName, id) {
    //   var configArray = this.configs[modelName];
    //   for (var i = 0; i < configArray.length; i ++) {
    //     if (configArray[i]._id == id) {
    //       return configArray[i];
    //     }
    //   }
    //   logger.error('Unable to find requested config document for config model: ' + modelName + ' with id: ' + id);
    // }


  // })

  // smsConfigsLoader(function(configObject) {
  //   console.log('****hello config object', configObject)

  //   console.log('***app object', JSON.stringify(app))
  //   app.configs = configObject;
  //   // done();
  // });

  it('loads the sms configuration documents into memory from the database', function(done) {
    smsConfigsLoader(function(configObject) {
      console.log('****hello config object', configObject)

      console.log('***app object', JSON.stringify(app))
      app.configs = configObject;
      done();
    });
  });

  it('runs all the responder tests', function() {
    console.log('within ****');
    // require('./BullyText.js');
    require('./ds-routing.js');
    // require('./EndGameFromUserExit.js');
    // require('./GameAlphaStart');
    // require('./lib.test.js');
    // require('./mobilecommons.js');
    // require('./ScienceSleuth.js');
  })




});