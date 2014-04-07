var application_root = __dirname
    , express = require('express')
    , fs = require('fs')
    , babysitter_api = require('./pregnancytext/babysitter-api')
    , comebackclothes_api = require('./lib/comeback-clothes/comebackclothes-api')
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
 * For loader.io load testing.
 */
if (process.env.LOADERIO_VERIFY_KEY) {
  // loader.io verifies the domain by querying this location based off of the
  // generated key that they provide.
  app.get('/' + process.env.LOADERIO_VERIFY_KEY, function(req, res) {

    // Return the key file provided by loader.io.
    var filename = process.env.LOADERIO_VERIFY_KEY + '.txt';
    fs.readFile(filename, "binary", function(err, file) {
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

/**
 * Pregnancy Text 2014
 */
app.post('/pregnancy-text/send-babysitter-invite-alpha', function(req, res) {
  babysitter_api.onSendBabysitterInvite(req, res, babysitter_api.optinParentOnInviteAlpha,
    babysitter_api.campaignIdParentNoBsAlpha);
});

app.post('/pregnancy-text/send-babysitter-invite-beta', function(req, res) {
  babysitter_api.onSendBabysitterInvite(req, res, babysitter_api.optinParentOnInviteBeta,
    babysitter_api.campaignIdParentNoBsBeta);
});

app.post('/pregnancy-text/wait-tips', function(req, res) {
  babysitter_api.deliverTips(req, res, babysitter_api.waitTipsName);
});
app.post('/pregnancy-text/safe-tips', function(req, res) {
  babysitter_api.deliverTips(req, res, babysitter_api.safeTipsName);
});
app.post('/pregnancy-text/parent-tips', function(req, res) {
  babysitter_api.deliverTips(req, res, babysitter_api.parentTipsName);
});
app.post('/pregnancy-text/rights-tips', function(req, res) {
  babysitter_api.deliverTips(req, res, babysitter_api.rightsTipsName);
});

/**
 * Comeback Clothes 2014
 */
app.post('/comeback-clothes/poster-tips', function(req, res) {
  comebackclothes_api.deliverTips(req, res, null);
});
