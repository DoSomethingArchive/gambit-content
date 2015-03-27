/**
 * A series of helper functions which update Mobile Commons profiles with the names of users 
 * who are invited to or have joined a game, then sends messages based on those names. 
 */
var mobilecommons = rootRequire('mobilecommons')
  , emitter = rootRequire('app/eventEmitter')
  , message = require('./gameMessageHelpers')
  , record = require('./gameRecordHelpers')
  ;

module.exports = {
  alphaInvite : createGameInviteAll,
  betaJoin : betaJoinNotifyAllPlayers
}

/**
 * Called when an Alpha user creates a game. Updates the Alpha player's 
 * Mobile Commons profile with the names of friends she's invited, then 
 * sends her the 'game has been created' message and invites all other players. 
 * For the purposes of SMS games, that message will contain those names. 
 * If names aren't present, phone numbers are used. 
 *
 * @param  gameDoc
 *  The document storing game data, including player names and numbers. 
 * @param alphaWaitOip
 *  The opt in path of the message sent to the alpha alerting her that she's
 *  created a game. Contains the names of invited players. 
 * 
 */
function createGameInviteAll(gameConfig, gameDoc) {
  // @todo I'M SORRY TONG. WE'LL FIX THIS LATER.
  // var i
  //   , args
  //   , profileUpdateString = ''
  //   , betas = gameDoc.betas
  //   ;

  // for (i = 0; i < betas.length; i++) {
  //   profileUpdateString += betas[i].name;
  //   if (i != betas.length - 1) {
  //     profileUpdateString += ', ';
  //   }
  //   message.singleUser(betas[i].phone, gameConfig.beta_join_ask_oip);
  // }

  // args = { 'players_not_in_game': profileUpdateString };
  // mobilecommons.profile_update(gameDoc.alpha_phone, gameConfig.alpha_wait_oip, args);
  // emitter.emit('single-user-opted-in', args);

  var args
    , betas = []
    , i
    ;

  for (i = 0; i < gameDoc.betas.length; i++) {
    betas[i] = gameDoc.betas[i].phone;
  }

  args = {
    alphaPhone: gameDoc.alpha_phone,
    alphaOptin: gameConfig.alpha_wait_oip,
    betaPhone: betas,
    betaOptin: gameConfig.beta_join_ask_oip
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
    mobilecommons.profile_update(hasJoined[j], gameConfig.notify_joined_betas_that_beta_has_joined, args);
    gameDoc = record.updatedPlayerStatus(gameDoc, hasJoined[j], gameConfig.notify_joined_betas_that_beta_has_joined);
  }

  return gameDoc;
}