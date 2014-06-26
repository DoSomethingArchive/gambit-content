var SGCollaborativeStoryController = function(app) {
  this.app = app;
};

SGCollaborativeStoryController.prototype.createGame = function(request, response) {
  response.send('TODO: implement createGame for type: ' + request.body.type);
};

module.exports = SGCollaborativeStoryController;
