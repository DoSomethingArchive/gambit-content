/**
 * A series of helper functions which help to determine 
 */
var mobilecommons = rootRequire('mobilecommons')
  , emitter = rootRequire('app/eventEmitter')
  ;

module.exports = {
  addPlayerNamesToAlpha : addPlayerNamesToAlpha,
  betaJoin : betaJoinNotifyAllPlayers
}

/**
 * Called when an Alpha user creates a game. Updates the Alpha player's 
 * Mobile Commons profile with the names of friends 
 * she's invited, then sends her a message. For the purposes of SMS games, 
 * that message will contain those names. If names aren't present, phone 
 * numbers are used. 
 *
 * @param  gameDoc
 *  The document storing game data, including player names and numbers. 
 * @param alphaWaitOip
 *  The opt in path of the message sent to the alpha alerting her that she's
 *  created a game. Contains the names of invited players. 
 * 
 */
function addPlayerNamesToAlpha(gameDoc) {
  var i
    , args
    , profileUpdateString = ''
    , betas = gameDoc.betas
    ; 

  for (i = 0; i < betas.length; i++) {
    profileUpdateString += betas[i].name 
    if (i != betas.length - 1) {
      profileUpdateString += ', '
    }
  }

  args = { 'other_players_not_in_game': profileUpdateString };
  mobilecommons.profile_update(gameDoc.alpha_phone, null, args);
  emitter.emit('single-user-opted-in', args);
}

/**
 * Called when a Beta user joins a game. 
 * 1 - Updates all players' Mobile Commons profile with the names of a) other
 * players who've joined, and b) other players who haven't joined yet. 
 * 2 - Then, sends all players messages containing this info.
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

}