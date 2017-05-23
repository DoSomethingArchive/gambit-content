'use strict';

const express = require('express');
const favicon = require('serve-favicon');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
// serve favicon
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
// parse application/json Content-Type
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded Content-Type
app.use(bodyParser.urlencoded({ extended: true }));
// 504 timeouts middleware
require('./lib/middleware/timeouts')(app);
// require all routes
require('./app/routes')(app);

module.exports = app;
