var logger = rootRequire('app/lib/logger')

var stathatReport = function(type, category, action, label, storyId, num) {
  var statname = category + ': ' + action + ': ' + label + ': ' + 'story-id=' + storyId;
  app.stathatReport(type, statname, num);
}

var onPromiseErrorCallback = function(err) {
  if (err) {
    logger.error(this.message + '\n', err.stack);
  }
}

/**
 * The following function is for handling Mongoose Promise chain errors.
 */

module.exports = {
  promiseErrorCallback : function(message) {
    return onPromiseErrorCallback.bind({message: message});
  },

  /**
   * StatHat reporting wrappers. Organizes stat names into a "{category}: {action}: {label}: story-id={id}" structure.
   */
  stathatReportCount : function(category, action, label, storyId, count) {
    stathatReport('Count', category, action, label, storyId, count);
  },

  stathatReportValue : function(category, action, label, storyId, value) {
    stathatReport('Value', category, action, label, storyId, value);
  },

  /**
   * Method for passing object data into a delegate.
   *
   * @param obj
   *   The object to apply to the 'this' value in the delegate.
   * @param delegate
   *   The function delegate.
   */
  createCallback : function(obj, delegate) {
    return function() {
      delegate.apply(obj, arguments);
    }
  },

  /**
   * Evalutes whether or not a player's story results match a given condition.
   *
   * @param condition
   *   Logic object
   * @param phone
   *   Phone number of player to check
   * @param gameDoc
   *   Document for the current game.
   * @param checkResultType
   *   What property the conditions are checking against. Either "oip" or "answer".
   *
   * @return Boolean
   */
  evaluateCondition : function(condition, phone, gameDoc, checkResultType) {

    /**
     * Check if the player has provided a given answer in this game.
     *
     * @param result
     *   The result to check against.
     *
     * @return Boolean
     */
    var checkUserResult = function(result) {
      for (var i = 0; i < gameDoc.story_results.length; i++) {
        if (gameDoc.story_results[i].phone == phone) {
          if (checkResultType == 'oip' && gameDoc.story_results[i].oip == result) {
            return true;
          }
          else if (checkResultType == 'answer' && gameDoc.story_results[i].answer == result) {
            return true;
          }
        }
      }

      return false;
    };

    /**
     * Recursive function to evaluate $and/$or logic objects. These objects are
     * arrays of some combination of strings (which are user answers) and more
     * logic objects.
     *
     *   ie:
     *     "$or": [string | logic object, ...]
     *     "$and": [string | logic object, ...]
     *
     * @param obj
     *   Logic object.
     *
     * @return Boolean
     */
    var evalObj = function(obj) {
      var result = false;

      if (obj['$or']) {

        var conditions = obj['$or'];
        for (var i = 0; i < conditions.length; i++) {
          // If anything is true, then result is true.
          if ((typeof conditions[i] === 'string' && checkUserResult(conditions[i])) ||
              (typeof conditions[i] === 'object' && evalObj(conditions[i]))) {
            result = true;
            break;
          }
        }

      }
      else if (obj['$and']) {

        result = true;
        var conditions = obj['$and'];
        for (var i = 0; i < conditions.length; i++) {
          // If anything is false, then result is false.
          if ((typeof conditions[i] === 'string' && !checkUserResult(conditions[i])) ||
              (typeof conditions[i] === 'object' && !evalObj(conditions[i]))) {
            result = false;
            break;
          }
        }

      }

      return result;
    };

    return evalObj(condition);
  }  
}
