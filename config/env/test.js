'use strict';

require('dotenv').config();

const dbName = 'ds-mdata-responder-test';
let dbUri = `mongodb://localhost/${dbName}`;

// Running in wercker
if (process.env.MONGO_PORT_27017_TCP_ADDR) {
  dbUri = `mongodb://${process.env.MONGO_PORT_27017_TCP_ADDR}:${process.env.MONGO_PORT_27017_TCP_PORT}/${dbName}`;
}

const configVars = {
  dbUri,
};

module.exports = configVars;
