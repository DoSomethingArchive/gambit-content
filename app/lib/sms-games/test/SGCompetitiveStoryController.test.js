var assert = require('assert')
  , connectionOperations = rootRequire('app/config/connectionOperations')
  , emitter = rootRequire('app/eventEmitter')
  , SGCompetitiveStoryController = require('../controllers/SGCompetitiveStoryController')
  ;

function test() {
  describe('SGCompetitiveStoryController.createGame', function() {
    var gameController;

    before(function() {
      gameController = new SGCompetitiveStoryController;
    });

    it('should do this thing');

    after(function() {
      // destroy the game
    });
  })
}