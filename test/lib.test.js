var path = require('path')
  ;

var appRoot = path.resolve('./');

require(appRoot + '/app/lib/reportback/test/reportback.test')();
