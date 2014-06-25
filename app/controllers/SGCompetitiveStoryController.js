var SGCompetitiveStoryController = function(app) {
  this.app = app;
};

SGCompetitiveStoryController.prototype.createGame = function(request, response) {
  response.send('TODO: implement createGame for type: ' + request.body.type);
};

module.exports = SGCompetitiveStoryController;
