var application_root = __dirname
    , express = require('express')
    , path = require('path')
    , request = require('request')
    , mobilecommons = require('./mobilecommons/mobilecommons')
    , babysitter_api = require('./pregnancytext/babysitter-api')
    ;

/**
 * Express Setup
 */
var app = express();

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
 * Pregnancy Text 2014
 */
app.post('/send-babysitter-invite', babysitter_api.onSendBabysitterInvite);
