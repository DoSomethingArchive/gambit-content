/**
 * Submit Puppet Sloth quotes via SMS.
 */

var express = require('express')
  , router = express.Router()
  , mobilecommons = rootRequire('mobilecommons')
  , smsHelper = rootRequire('app/lib/smsHelpers')
  , logger = rootRequire('app/lib/logger')
  ;

/**
 *
 * POST /puppet-sloth/:food
 *
 */
router.post('/:food', function(request, response) {
  phone = smsHelper.getNormalizedPhone(request.body.phone);
  console.log(phone + " has requested puppet time for " + request.body.args);
  response.send('Next question!');
  var args = {
    alphaPhone: phone,
    alphaOptin: 210045
  };
  mobilecommons.optin(args);
});

module.exports = router;

