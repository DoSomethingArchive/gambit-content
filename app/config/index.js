var path = require('path')
  , express = require('express')
  , fs = require('fs')
  , root_dirname = path.dirname(path.dirname(__dirname))
  , mongoose = require('mongoose')
  , stathat = require('stathat')
  , errorHandler = require('errorhandler')
  , bodyParser = require('body-parser')
  , configLoader = require('./configLoader')
  ;

module.exports = function() {

  // Set port variable
  app.set('port', process.env.PORT || 4711);

  // Parses request body and populates request.body
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));

  // For multi-part parsing
  app.use(require('connect-multiparty')());

  // Show all errors in development
  app.use(errorHandler());

  // Add static path
  app.use(express.static(path.join(root_dirname, 'public')));

  // Set the database URI this app will use for SMS operations.
  app.set('operations-database-uri', process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder');

  // Set the database URI this app will use to retrieve SMS config files.
  app.set('config-database-uri', process.env.CONFIG_DB_URI || 'mongodb://localhost/config')

  // @TODO: Find a better way of passing the host URL to SGSoloController.createSoloGame()
  // Specify app host URL. 
  if (process.env.NODE_ENV == 'production') {
    app.hostName = 'ds-mdata-responder.jit.su';
  } else {
    app.hostName = 'localhost:' + app.get('port');
  }

  // Only opens connection if its state is disconnected.
  if (mongoose.connection.readyState === 0) {
    mongoose.connect(app.get('operations-database-uri'));
  }

  // Imports config files and attaches to the app object in memory. 
  app.config = configLoader();

  /**
   * Global stathat reporting wrapper function
   *
   * @param type
   *   String type of stathat report (Count or Value)
   * @param statname
   *   String statname to track
   * @param count
   *   Integer the value or count you want to add
   */
  app.stathatReport = function(type, statname, count) {
    stathat["trackEZ" + type](
      process.env.STATHAT_EZ_KEY,
      statname,
      count,
      function(status, json) {}
    );
  };

  app.configs = {};

  app.getConfigs = function() {};


  // Read through .json configs in the config folder and set to app variables
  // fs.readdirSync('./app/config').forEach(function(file) {
  //   if (file != path.basename(__filename)) {

  //     var name = file.substr(0, file.lastIndexOf('.'))
  //     var ext = file.substr(file.lastIndexOf('.'));
  //     if (ext === '.json') {
  //       var data = fs.readFileSync(root_dirname + '/app/config/' + file);

  //       app.set(
  //         name,
  //         JSON.parse(data)
  //       );

  //       // Example:  app.get('mongo') will have the json object from app/config/mongo.json
  //     }

  //   }
  // });
}
