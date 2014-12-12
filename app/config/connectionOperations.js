var mongoose = require('mongoose');

var connectionOperations;

if (!connectionOperations || !connectionOperations.readyState) {
  module.exports = connectionOperations = mongoose.createConnection(app.get('operations-database-uri'));
} else {
  module.exports = connectionOperations
}

// module.exports = connectionOperations = mongoose.createConnection(app.get('operations-database-uri'));

connectionOperations.on('connected', function() {  
  console.log('Mongoose connected to connectionOperations with status code: ' + connectionOperations.readyState);
});