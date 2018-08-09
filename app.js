'use strict';

const config = require('./config');
const express = require('express');
const favicon = require('serve-favicon');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
/**
 * Set app locals
 * @see https://expressjs.com/en/4x/api.html#app.locals
 */
app.locals.forceHttps = config.forceHttps;

// serve favicon
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
// parse application/json Content-Type
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded Content-Type
app.use(bodyParser.urlencoded({ extended: true }));
// require all routes
require('./app/routes')(app);

module.exports = app;
