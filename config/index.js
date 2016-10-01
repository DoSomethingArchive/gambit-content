'use strict';

/**
 * Imports.
 */
const express = require('express');
const path = require('path');
const rootDirName = path.dirname(path.dirname(__dirname));

const errorHandler = require('errorhandler');
const bodyParser = require('body-parser');

module.exports = function () {
  // Parses request body and populates request.body
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  // For multi-part parsing
  app.use(require('connect-multiparty')());
  // Show all errors in development
  app.use(errorHandler());
  // Add static path
  app.use(express.static(path.join(rootDirName, 'public')));

  app.locals.clients = {};

  const NorthstarClient = require('@dosomething/northstar-js');
  app.locals.clients.northstar = new NorthstarClient({
    baseURI: process.env.DS_NORTHSTAR_API_BASEURI,
    apiKey: process.env.DS_NORTHSTAR_API_KEY,
  });

  const PhoenixClient = require('@dosomething/phoenix-js');
  app.locals.clients.phoenix = new PhoenixClient({
    baseURI: process.env.DS_PHOENIX_API_BASEURI,
    username: process.env.DS_PHOENIX_API_USERNAME,
    password: process.env.DS_PHOENIX_API_PASSWORD,
  });
};
