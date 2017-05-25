'use strict';

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

// Based on the answers of this Stack Overflow thread
// http://stackoverflow.com/questions/38486384/mongodb-connection-to-mongolab-timing-out-in-nodejs-on-heroku
const connOpts = {
  server: {
    socketOptions: {
      keepAlive: parseInt(process.env.DB_KEEPALIVE, 10) || 300000,
      connectTimeoutMS: parseInt(process.env.DB_TIMEOUT_MS, 10) || 30000,
    },
  },
  replset: {
    socketOptions: {
      keepAlive: parseInt(process.env.DB_KEEPALIVE, 10) || 300000,
      connectTimeoutMS: parseInt(process.env.DB_TIMEOUT_MS, 10) || 30000,
    },
  },
};

module.exports = function init(options) {
  // Connect to database
  // returns a Promise
  // dummy function needed to bubble error to .catch(): https://github.com/Automattic/mongoose/issues/4135
  return mongoose.connect(options.dbUri, connOpts, () => {});
};
