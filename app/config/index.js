var path = require('path');
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

}
