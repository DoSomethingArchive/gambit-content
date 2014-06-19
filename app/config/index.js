var path = require('path');
var fs = require('fs');
var root_dirname = path.dirname(path.dirname(__dirname));

module.exports = function(app, express) {
  app.configure(function() {
    // Set port variable
    app.set('port', process.env.PORT || 4711);

    // Parses request body and populates request.body
    app.use(express.bodyParser());

    // Checks request.body for HTTP method override
    app.use(express.methodOverride());

    // Perform route lookup based on url and HTTP method
    app.use(app.router);

    // Show all errors in development
    app.use(express.errorHandler({dumpException: true, showStack: true}));

    // Add static path
    app.use(express.static(path.join(root_dirname, 'public')));
  });

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
