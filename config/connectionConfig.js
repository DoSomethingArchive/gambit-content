const mongoose = require('mongoose');
const dbUri = process.env.CONFIG_DB_URI || 'mongodb://localhost/config';

var connectionConfig;

if (!connectionConfig || !connectionConfig.readyState) {
  module.exports = connectionConfig = mongoose.createConnection(dbUri);
} 
else {
  module.exports = connectionConfig;
}

connectionConfig.on('connected', function() { 
  console.log(`connectionConfig readyState:${connectionConfig.readyState}`);
});
