var path = require('path')
  , express = require('express')
  , fs = require('fs')
  , root_dirname = path.dirname(path.dirname(__dirname))
  , mongoose = require('mongoose')
  , stathat = require('stathat')
  , errorHandler = require('errorhandler')
  , bodyParser = require('body-parser')
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

  // Set the database URI this app will use.
  app.set('database-uri', process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder');

  // Opens the default mongoose database connection.
  if (typeof isConnectionOpen === 'undefined') {
    mongoose.connect(app.get('database-uri'));
    isConnectionOpen = true;
  }

  // Attaches the Mongoose instance to the app global variable. 
  app.mongoose = mongoose;

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

  /**
   * Helper function to retrieve a Mongoose model.
   *
   * @param modelName
   *   String of the name of the model
   * @param schema
   *   Mongoose schema to create a model with
   *
   * @return Mongoose model
   */
  // app.getModel = function(modelName, schema) {
  //   // If a model by this name has already been created, return it.
  //   var modelNames = dbConnection.modelNames();
  //   for (var i = 0; i < modelNames.length; i++) {
  //     if (modelName == modelNames[i]) {
  //       return dbConnection.model(modelName);
  //     }
  //   }

  //   // If no existing model is found, create a new one.
  //   return dbConnection.model(modelName, schema);
  // };

  // Read through .json configs in the config folder and set to app variables
  fs.readdirSync('./app/config').forEach(function(file) {
    if (file != path.basename(__filename)) {

      var name = file.substr(0, file.lastIndexOf('.'))
      var ext = file.substr(file.lastIndexOf('.'));
      if (ext === '.json') {
        var data = fs.readFileSync(root_dirname + '/app/config/' + file);

        app.set(
          name,
          JSON.parse(data)
        );

        // Example:  app.get('mongo') will have the json object from app/config/mongo.json
      }

    }
  });
}
