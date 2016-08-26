var express = require('express')
var router = express.Router();

var logger = rootRequire('app/lib/logger');
var chatbotRouter = require('./lib/chatbot');
var dsCampaignRouter = require('./lib/ds-routing');
var reportbackRouter = require('./lib/reportback');

app.use('/', router);

router.get('/', function (req, res) {
  res.send('hi');
});

router.use(function(req, res, next) {
  var apiKey = process.env.GAMBIT_API_KEY;
  if (req.method === 'POST' && req.headers['x-gambit-api-key'] !== apiKey) {
    logger.warn('router invalid x-gambit-api-key:', req.url);
    return res.sendStatus(403);
  }
  next();
});

router.use('/v1/chatbot', chatbotRouter);
router.use('/ds-routing', dsCampaignRouter);
router.use('/reportback', reportbackRouter);
