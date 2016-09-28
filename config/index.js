/**
 * Imports.
 */
const express = require('express');
const path = require('path');
const root_dirname = path.dirname(path.dirname(__dirname));
const stathat = require('stathat');
const errorHandler = require('errorhandler');
const bodyParser = require('body-parser');
const NorthstarClient = require('@dosomething/northstar-js');
const PhoenixClient = require('@dosomething/phoenix-js');

module.exports = function() {

  // Parses request body and populates request.body
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));

  // For multi-part parsing
  app.use(require('connect-multiparty')());

  // Show all errors in development
  app.use(errorHandler());

  // Add static path
  app.use(express.static(path.join(root_dirname, 'public')));

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

  const conn = rootRequire('config/connectionOperations');
  app.locals.db = {
    reportbackSubmissions: rootRequire('api/models/campaign/ReportbackSubmission')(conn),
    signups: rootRequire('api/models/campaign/Signup')(conn),
    users: rootRequire('api/models/User')(conn),
  };

  app.locals.clients = {};
  app.locals.clients.northstar = new NorthstarClient({
    baseURI: process.env.DS_NORTHSTAR_API_BASEURI,
    apiKey: process.env.DS_NORTHSTAR_API_KEY,
  });
  app.locals.clients.phoenix = new PhoenixClient({
    baseURI: process.env.DS_PHOENIX_API_BASEURI,
    username: process.env.DS_PHOENIX_API_USERNAME,
    password: process.env.DS_PHOENIX_API_PASSWORD,
  });

}
