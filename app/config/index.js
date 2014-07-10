var path = require('path');
var fs = require('fs');
var root_dirname = path.dirname(path.dirname(__dirname));

module.exports = function(app, express) {

  // Set port variable
  app.set('port', process.env.PORT || 4711);

  // Parses request body and populates request.body
  app.use(express.json());
  app.use(express.urlencoded());

  // For multi-part parsing
  app.use(require('connect-multiparty')());

  // Perform route lookup based on url and HTTP method
  app.use(app.router);

  // Show all errors in development
  app.use(express.errorHandler({dumpException: true, showStack: true}));

  // Add static path
  app.use(express.static(path.join(root_dirname, 'public')));

  // Set the database URI this app will use.
  app.set('database-uri', 'mongodb://localhost/ds-mdata-responder');

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
