/**
 * A series of helper functions which update Mobile Commons profiles with the names of users 
 * who are invited to or have joined a game, then sends messages based on those names. 
 */
var mobilecommons = rootRequire('mobilecommons')
  , emitter = rootRequire('app/eventEmitter')
  , message = require('./gameMessageHelpers')
  , record = require('./gameRecordHelpers')
  , connectionOperations = rootRequire('app/config/connectionOperations')
  , userModel = rootRequire('app/lib/sms-games/models/sgUser')(connectionOperations)
  ;

module.exports = {
  alphaInvite : createGameInviteAll,
  betaJoin : betaJoinNotifyAllPlayers,
  endLevel : endLevelMessageWithSuccessPlayerNames
}

/**
 * Called when an Alpha user creates a game. Updates the Alpha player's 
 * Mobile Commons profile with the names of friends she's invited, then 
 * sends her the 'game has been created' message and invites all other players. 
 * For the purposes of SMS games, that message will contain those names. 
 * If names aren't present, phone numbers are used. 
 *
 * @param gameConfig
 *  The configuration document for the game, containing opt in path ids. 
 * @param  gameDoc
 *  The document storing game data, including player names and numbers. 
 * 
 */
function createGameInviteAll(gameConfig, gameDoc) {

  var args
    , callback
    , betas = []
    , profileUpdateString = ''
    , i
    ;

  for (i = 0; i < gameDoc.betas.length; i++) {
    betas[i] = gameDoc.betas[i].phone;
    profileUpdateString += gameDoc.betas[i].name;
    if (i != gameDoc.betas.length - 1) {
      profileUpdateString += ', ';
    }
  }

  args = {
    alphaPhone: gameDoc.alpha_phone,
    alphaOptin: gameConfig.alpha_wait_oip,
    betaPhone: betas,
    betaOptin: gameConfig.beta_join_ask_oip,
    players_not_in_game: profileUpdateString
  };

  mobilecommons.optin(args);
}

/**
 * Called when a Beta user joins a game. 
 * 1 - Updates all players' Mobile Commons profile with the names of a) other
 * players who've joined, and b) other players who haven't joined yet. 
 * 2 - Then, sends all players messages containing this info.
 * 3 - Finally, updates all the gameDoc
 *
 * @param gameConfig
 *  The configuration file for the SMS game. 
 * @param gameDoc
 *  The document storing game data, including player names and number. 
 * @param joiningBetaPhone
 *  The phone number of the Beta user who just joined the game. 
 * 
 */
function betaJoinNotifyAllPlayers(gameConfig, gameDoc, joiningBetaPhone) {
  var i
    , j
    , args
    , removeIndex
    , hasJoined = []
    , hasNotJoined = ''
    , justJoined = ''
    , betas = gameDoc.betas
    ;

  for (i = 0; i < betas.length; i++) {
    if (!betas[i].invite_accepted) {
      hasNotJoined = hasNotJoined + betas[i].name + ', ';
    }
    else if (betas[i].phone == joiningBetaPhone) {
      justJoined = betas[i].name;
    }
    else {
      hasJoined.push(betas[i].phone);
    }
  }

  removeIndex = hasNotJoined.lastIndexOf(", ");
  hasNotJoined = hasNotJoined.substring(0, removeIndex);

  args = {
    'players_not_in_game': hasNotJoined,
    'player_just_joined': justJoined
  }
  
  // message player who has just joined
  mobilecommons.profile_update(joiningBetaPhone, gameConfig.beta_wait_oip, args);
  gameDoc = record.updatedPlayerStatus(gameDoc, joiningBetaPhone, gameConfig.beta_wait_oip);

  // message alpha about who just joined
  mobilecommons.profile_update(gameDoc.alpha_phone, gameConfig.alpha_start_ask_oip, args);
  gameDoc = record.updatedPlayerStatus(gameDoc, gameDoc.alpha_phone, gameConfig.alpha_start_ask_oip);

  // message players who have already joined
  for (j = 0; j < hasJoined.length; j++) {
    mobilecommons.profile_update(hasJoined[j], gameConfig.beta_joined_notify_other_betas_oip, args);
    gameDoc = record.updatedPlayerStatus(gameDoc, hasJoined[j], gameConfig.beta_joined_notify_other_betas_oip);
  }

  return gameDoc;
}

function endLevelMessageWithSuccessPlayerNames(gameConfig, gameDoc, delay) {
  var i, j
    , path
    , alphaPlayer
    , allPlayers = []
    , successPlayers = []
    , successConfigKey
    , nameString = ''
    , removeIndex
    , currentStatus = gameDoc.players_current_status
    , successPaths = gameConfig['END-GAME']['indiv-level-success-oips']
    ;

  // finding all players who gave correct answers
  for (i = 0; i < currentStatus.length; i++) {
    path = currentStatus[i].opt_in_path;
    for (j = 0; j < successPaths.length; j++) {
      if (path == successPaths[j]) {
        successPlayers.push(currentStatus[i]);
      }
    }
  }

  // assembling an array with all player data
  alphaPlayer = { "name": gameDoc.alpha_name, "phone": gameDoc.alpha_phone };
  allPlayers = gameDoc.betas;
  allPlayers.push(alphaPlayer);

  // assembling a string of all the correct players' names
  for (i = 0; i < successPlayers.length; i++) {
    for (j = 0; j < allPlayers.length; j++) {
      if (successPlayers[i].phone == allPlayers[j].phone) {
        nameString += successPlayers[i].name;
        nameString += ', ';
      }
    }
  }

  successConfigKey = successPlayers.length + '/' + allPlayers.length; 

  for (i = 0; i < allPlayers.length; i++) {
    message.singleUserWithDelay(allPlayers[i].phone, gameConfig['END-LEVEL'][successConfigKey], delay, gameDoc._id, userModel, {'players_level_success' : nameString});
  }

  removeIndex = hasNotJoined.lastIndexOf(", ");
  nameString = nameString.substring(0, removeIndex);

}