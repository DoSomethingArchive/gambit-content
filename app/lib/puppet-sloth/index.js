/**
 * Submit Puppet Sloth quotes via SMS.
 */

var express = require('express')
  , router = express.Router()
  , mobilecommons = rootRequire('mobilecommons')
  , logger = rootRequire('app/lib/logger')
  ;

/**
 *
 * POST /puppet-sloth/:food
 *
 */
router.post('/:food', function(request, response) {
  console.log("Puppet time");
  response.send('Next question!');
});

module.exports = router;

