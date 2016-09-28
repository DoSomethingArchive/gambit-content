const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const dbUri = process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder';

var connectionOperations;

if (!connectionOperations || !connectionOperations.readyState) {
  module.exports = connectionOperations = mongoose.createConnection(dbUri);
} 
else {
  module.exports = connectionOperations;
}

connectionOperations.on('connected', function() {  
  console.log(`connectionOperations readyState:${connectionOperations.readyState}`);
});
