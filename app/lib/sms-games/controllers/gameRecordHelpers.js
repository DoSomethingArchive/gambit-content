// Contains all the helper functions which record game actions within the gamedoc. 

module.exports = {
  /**
   * Updates the game document with the player's current status.
   *
   * @param gameDoc
   *   Game document to modify.
   * @param phone
   *   Phone number of the player to update.
   * @param currentPath
   *   Current opt in path that the user is on.
   *
   * @return Updated game document.
   */
  updatedPlayerStatus : function(gameDoc, phone, currentPath) {
    var updated = false;
    for (var i = 0; i < gameDoc.players_current_status.length; i++) {
      if (gameDoc.players_current_status[i].phone == phone) {
        gameDoc.players_current_status[i].opt_in_path = currentPath;
        gameDoc.players_current_status[i].updated_at = Date.now();
        updated = true;
      }
    }

    if (!updated) {
      var idx = gameDoc.players_current_status.length;
      gameDoc.players_current_status[idx] = {};
      gameDoc.players_current_status[idx].phone = phone;
      gameDoc.players_current_status[idx].opt_in_path = currentPath;
      gameDoc.players_current_status[idx].updated_at = Date.now();
    }

    return gameDoc;
  },

  /**
   * Add to the story_results array of a game document.
   *
   * @param gameDoc
   *   Game document to modify.
   * @param phone
   *   Phone number of the player to add a result for.
   * @param oip
   *   Opt in path to add.
   *
   * @return Updated game document.
   */
  updatedStoryResults : function(gameDoc, phone, oip, answer) {
    var idx = gameDoc.story_results.length;
    gameDoc.story_results[idx] = {};
    gameDoc.story_results[idx].oip = oip;
    gameDoc.story_results[idx].phone = phone;
    if (answer) {
      gameDoc.story_results[idx].answer = answer;
    }
    gameDoc.story_results[idx].created_at = Date.now();

    return gameDoc;
  }
}