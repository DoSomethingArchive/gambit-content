var mongoose = require('mongoose');

var connectionConfig;

// if (!connectionConfig || !connectionConfig.readyState) {
//   module.exports = connectionConfig = mongoose.createConnection(app.get('config-database-uri'));
// } else {
//   module.exports = connectionConfig
// }

module.exports = connectionConfig = mongoose.createConnection(app.get('config-database-uri'));

connectionConfig.on('connected', function() { 
  console.log('Mongoose connected to connectionConfig with status code: ' + connectionConfig.readyState);
});