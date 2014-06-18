var application_root = __dirname
    , express = require('express');

/**
 * Express Setup
 */
var app = express();

var routes = require('./app/router.js')(app);

app.configure(function() {
  // Parses request body and populates request.body
  app.use(express.bodyParser());

  // Checks request.body for HTTP method override
  app.use(express.methodOverride());

  // Perform route lookup based on url and HTTP method
  app.use(app.router);

  // Show all errors in development
  app.use(express.errorHandler({dumpException: true, showStack: true}));
});

// Start server
var port = process.env.PORT || 4711;
app.listen(port, function() {
  console.log('Express server listening on port %d in %s mode...\n\n', port, app.settings.env);
});

/**
 * Routes
 */

/**
 * For loader.io load testing.
 * @TODO: move me to static file
 */
if (process.env.LOADERIO_VERIFY_KEY) {
  // loader.io verifies the domain by querying this location based off of the
  // generated key that they provide.
  app.get('/' + process.env.LOADERIO_VERIFY_KEY, function(req, res) {

    // Return the key file provided by loader.io.
    var filename = process.env.LOADERIO_VERIFY_KEY + '.txt';
    require('fs').readFile(filename, "binary", function(err, file) {
      if(err) {
        res.writeHead(500, {"Content-Type": "text/plain"});
        res.write(err + "\n");
        res.end();
        return;
      }

      res.writeHead(200);
      res.write(file, "binary");
      res.end();
    });
  });
}
