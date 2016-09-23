var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var connectionOperations;

if (!connectionOperations || !connectionOperations.readyState) {
  module.exports = connectionOperations = mongoose.createConnection(app.get('operations-database-uri'));
} else {
  module.exports = connectionOperations
}

connectionOperations.on('connected', function() {  
  console.log('Mongoose connected to connectionOperations with status code: ' + connectionOperations.readyState);
});