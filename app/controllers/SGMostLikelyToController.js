var SGMostLikelyToController = function(app) {
  this.app = app;
};

SGMostLikelyToController.prototype.createGame = function(request, response) {
  response.send('TODO: implement createGame for type: ' + request.body.type);
};

module.exports = SGMostLikelyToController;
