/**
 * Handles all routes Slothbot.
 */

var express = require('express')
  , router = express.Router()
  , mobilecommons = rootRequire('mobilecommons')
  , smsHelper = rootRequire('app/lib/smsHelpers')
  , logger = rootRequire('app/lib/logger')
  ;

router.post('/', function(request, response) {
  // @todo Move hardcoded value into environment variable.
  var optin = 210045;
  phone = smsHelper.getNormalizedPhone(request.body.phone);
  logger.debug("user:" + phone + " sent @slothbot a message:" + request.body.args);
  response.send();  
  var mobileCommonsCustomFields = {
    slothbot_response: request.body.args
  };
  mobilecommons.profile_update(phone, optin, mobileCommonsCustomFields); 
});

module.exports = router;

