var application_root = __dirname
    , local_lib = './lib/'
    , express = require('express')
    , fs = require('fs')
    , babysitter_api = require('./pregnancytext/babysitter-api')
    , ds_routing_api = require(local_lib + 'ds/ds-routing-api')
    , tips_api = require(local_lib + 'ds/tips-api')
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

// For players who accidentally opt-out, we give them the option to get back into
// the game through an opt-in in a different campaign that continues the drip
// messages on the same day. For babysitter invites sent from this campaign,
// we'll push the players to the Beta w/ Babysitter campaign.
app.post('/pregnancy-text/send-babysitter-invite-resurrected', function(req, res) {
  babysitter_api.onSendBabysitterInvite(req, res, babysitter_api.optinParentOnInviteBeta,
    babysitter_api.campaignIdParentNoBsResurrected);
});

/**
 * Route user to appropriate opt-in path based on their answer to a Y/N question.
 */
app.get('/ds-routing/yes-no-gateway', ds_routing_api.yesNoGatewa);

/**
 * Transition users for the sign up campaign to the actual campaign.
 */
app.post('/ds-routing/start-campaign-gate', ds_routing_api.startCampaignGate);

/**
 * Once in the actual campaign, the first message a user gets is a welcome
 * message with the KNOW, PLAN, DO, and PROVE options. People can text 1-4 to
 * select what they want to do. This handles that.
 */
app.post('/ds/handle-start-campaign-response', ds_routing_api.handleStartCampaignResponse);

/**
 * Retrieve in-order tips.
 */
app.post('/ds/tips', tips_api.deliverTips);
