/**
 * Imports.
 */
const logger = rootRequire('lib/logger');

module.exports = {
  isValidState : isValidState,
  isValidZip : isValidZip,
  isValidEmail : isValidEmail,
  containsNaughtyWords : containsNaughtyWords
}

/**
 * Check if string is an abbreviated US state.
 *
 * @param state
 * @return Boolean
 */
function isValidState(state) {
  var states = 'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|GU|PR|VI';
  var split = states.split('|');
  if (split.indexOf(state.toUpperCase()) > -1) {
    return true;
  }
  else {
    return false;
  }
}

/**
 * Check if string is a valid zip code.
 *
 * @param zip
 * @return Boolean
 */
function isValidZip(zip) {
  return /(^\d{5}$)|(^\d{5}-\d{4}$)/.test(zip);
}

/**
 * Check if string is a valid email address.
 *
 * @param email
 * @return Boolean
 */
function isValidEmail(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

/**
 * Checks to see if user inputted strings contains naughty words. 
 *
 * @param phone
 *  Phone number to subscribe.
 * @param oip
 *   Opt-in path to subscribe to.
 */

function containsNaughtyWords(stringToBeCensored) {
  var naughtyWords = [ '2g1c', '2girls 1 cup', 'acrotomophilia', 'anal', 'anilingus', 'anus', 'arsehole', 'asshole', 'assmunch', 'autoerotic', 'autoerotic', 'babeland', 'babybatter', 'ballgag', 'ballgravy', 'ballkicking', 'balllicking', 'ballsack', 'ballsucking', 'bangbros', 'bareback', 'barelylegal', 'barenaked', 'bastardo', 'bastinado', 'bbw', 'bdsm', 'beavercleaver', 'beaverlips', 'bestiality', 'bicurious', 'bigblack', 'bigbreasts', 'bigknockers', 'bigtits', 'bimbos', 'birdlock', 'bitch', 'blackcock', 'blondeaction', 'blondeon blonde action', 'blowj', 'blowyourl', 'bluewaffle', 'blumpkin', 'bollocks', 'bondage', 'boner', 'boob', 'boobs', 'bootycall', 'brownshowers', 'brunetteaction', 'bukkake', 'bulldyke', 'bulletvibe', 'bunghole', 'bunghole', 'busty', 'buttcheeks', 'butthole', 'cameltoe', 'camgirl', 'camslut', 'camwhore', 'carpetmuncher', 'carpetmuncher', 'chink', 'chocolaterosebuds', 'circlejerk', 'clevelandsteamer', 'clit', 'clitoris', 'cloverclamps', 'clusterfuck', 'cock', 'cocks', 'coprolagnia', 'coprophilia', 'cornhole', 'cumming', 'cunnilingus', 'cunt', 'darkie', 'daterape', 'daterape', 'deepthroat', 'deepthroat', 'dick', 'dildo', 'dirtypillows', 'dirtysanchez', 'doggiestyle', 'doggiestyle', 'doggystyle', 'doggystyle', 'dogstyle', 'dolcett', 'domination', 'dominatrix', 'dommes', 'donkeypunch', 'doubledong', 'doublepenetration', 'dpaction', 'eatmyass', 'ecchi', 'ejaculation', 'erotic', 'erotism', 'escort', 'ethicalslut', 'eunuch', 'faggot', 'fecal', 'felch', 'fellatio', 'feltch', 'femalesquirting', 'femdom', 'figging', 'fingering', 'fisting', 'footfetish', 'footjob', 'frotting', 'fuck', 'fuckbuttons', 'fudgepacker', 'fudgepacker', 'futanari', 'gangbang', 'gaysex', 'genitals', 'giantcock', 'girlon', 'girlontop', 'girlsgonewild', 'goatcx', 'goatse', 'gokkun', 'goldenshower', 'goodpoop', 'googirl', 'goregasm', 'grope', 'groupsex', 'g-spot', 'guro', 'handjob', 'handjob', 'hardcore', 'hardcore', 'hentai', 'homoerotic', 'honkey', 'hooker', 'hotchick', 'howto kill', 'howto murder', 'hugefat', 'humping', 'incest', 'intercourse', 'jackoff', 'jailbait', 'jailbait', 'jerkoff', 'jigaboo', 'jiggaboo', 'jiggerboo', 'jizz', 'juggs', 'kike', 'kinbaku', 'kinkster', 'kinky', 'knobbing', 'leatherrestraint', 'leatherstraight jacket', 'lemonparty', 'lolita', 'lovemaking', 'makeme come', 'malesquirting', 'masturbate', 'menagea trois', 'milf', 'missionaryposition', 'motherfucker', 'moundofvenus', 'mrhands', 'muffdiver', 'muffdiving', 'nambla', 'nawashi', 'negro', 'neonazi', 'nigga', 'nigger', 'nignog', 'nimphomania', 'nipple', 'nipples', 'nsfwimages', 'nude', 'nudity', 'nympho', 'nymphomania', 'octopussy', 'omorashi', 'onecuptwogirls', 'oneguyone jar', 'orgasm', 'orgy', 'paedophile', 'panties', 'panty', 'pedobear', 'pedophile', 'pegging', 'penis', 'phonesex', 'pieceofshit', 'pissing', 'pisspig', 'pisspig', 'playboy', 'pleasurechest', 'polesmoker', 'ponyplay', 'poof', 'poopchute', 'poopchute', 'porn', 'porno', 'pornography', 'princealbert piercing', 'pthc', 'pubes', 'pussy', 'queaf', 'raghead', 'ragingboner', 'rape', 'raping', 'rapist', 'rectum', 'reversecowgirl', 'rimjob', 'rimming', 'rosypalm', 'rosypalm and her 5 sisters', 'rustytrombone', 'sadism', 'scat', 'schlong', 'scissoring', 'semen', 'sex', 'sexo', 'sexy', 'shavedbeaver', 'shavedpussy', 'shemale', 'shibari', 'shit', 'shota', 'shrimping', 'slanteye', 'slut', 's&m', 'smut', 'snatch', 'snowballing', 'sodomize', 'sodomy', 'spic', 'spooge', 'spreadlegs', 'strapon', 'strapon', 'strappado', 'stripclub', 'styledoggy', 'suck', 'sucks', 'suicidegirls', 'sultrywomen', 'swastika', 'swinger', 'taintedlove', 'tastemy', 'teabagging', 'threesome', 'throating', 'tiedup', 'tightwhite', 'tit', 'tits', 'titties', 'titty', 'tongueina', 'topless', 'tosser', 'towelhead', 'tranny', 'tribadism', 'tubgirl', 'tubgirl', 'tushy', 'twat', 'twink', 'twinkie', 'twogirls one cup', 'undressing', 'upskirt', 'urethraplay', 'urophilia', 'vagina', 'venusmound', 'vibrator', 'violetblue', 'violetwand', 'vorarephilia', 'voyeur', 'vulva', 'wank', 'wetback', 'wetdream', 'whitepower', 'womenrapping', 'wrappingmen', 'wrinkledstarfish', 'xx', 'xxx', 'yaoi', 'yellowshowers', 'yiffy', 'zoophilia' ]

  var noSpaceString = stringToBeCensored.toLowerCase().replace(/[^\w\s]/gi, '').replace(' ', '')

  for (var i = 0; i < naughtyWords.length; i++) {
    if (noSpaceString.indexOf(naughtyWords[i]) != -1) {
      return true;
    }
  } 
  return false; 
}


/**
 * Normalizes a phone number for processing. Prepends the '1' US international
 * code to the phone number if it doesn't have it.
 *
 * @param phone
 *   Phone number to normalize.
 *
 * @return Normalized phone number string.
 */
module.exports.getNormalizedPhone = function(phone) {
  if (!phone) {
    logger.error('smsHelper.getNormalizedPhone has been passed an undefined phone value.', console.trace());
    return '';
  }

  var newPhone = phone.replace(/\D/g, '');
  if (newPhone.length === 10) {
    newPhone = '1' + newPhone;
  }

  return newPhone;
};

/**
 * Checks if a phone number is valid.
 *
 * @param phone
 *   Phone number to check.
 *
 * @return true if valid. false, otherwise.
 */
module.exports.isValidPhone = function(phone) {
  if (phone && phone.length === 11) {
    return true;
  }
  else {
    return false;
  }
};

/**
 * Returns the first word in a given message.
 *
 * @param message
 *   String message to parse.
 *
 * @return First word of the message.
 */
function getFirstWord(message) {
  if (typeof message !== 'string') {
    return null;
  }
  var m = message.trim();
  if (m.indexOf(' ') >= 0) {
    return m.substr(0, m.indexOf(' '));
  }
  else {
    return m;
  }
};
module.exports.getFirstWord = getFirstWord;


/**
 * Returns the uppercase first word of given message.
 */
module.exports.getFirstWordUppercase = function (message) {
  const firstWord = getFirstWord(message);
  if (!firstWord) {
    return null;
  }

  return firstWord.toUpperCase();
}

/**
 * Determines whether or not the first word in the given message is 'YES' or a
 * variation of it.
 *
 * @param message
 *   String message to parse.
 *
 * @return Boolean
 */
module.exports.isYesResponse = function(message) {
  var m = message.toUpperCase().trim();
  m = getFirstWord(m);

  var noResponses = [
    'N',
    'NA',
    'NAH',
    'NO',
    'NIL'
  ];

  if (noResponses.indexOf(m) >= 0) {
    return false;
  }
  return true;

}

/**
 * Determines whether or not the given string contains letters. 
 *
 * @param message
 *   String message to parse.
 *
 * @return Bolean. 
 */
module.exports.hasLetters = function(message) {
  return RegExp(/[a-zA-Z]/g).test(message);
}

/**
 * Returns the letters contained in a string. 
 *
 * @param message
 *   String message to parse.
 *
 * @return String. 
 */
module.exports.getLetters = function(message) {
  return message.replace(/[^a-zA-Z]/g, '');
}

