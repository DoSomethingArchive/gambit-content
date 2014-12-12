var events = require('events')
  ;

var eventEmitter = new events.EventEmitter();

events.EventEmitter.prototype.events = {
  mcOptinTest: 'mobilecommons-optin-test',
  mcOptoutTest: 'mobilecommons-optout-test',
  mcProfileUpdateTest: 'mobilecommons-profile-update-test',
  reportbackModelUpdate: 'reportback-model-update'
};

module.exports = eventEmitter;
