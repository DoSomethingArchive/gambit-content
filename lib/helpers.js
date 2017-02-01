'use strict';

/**
 * Imports.
 */
const crypto = require('crypto');
const logger = app.locals.logger;

/**
 * Helper functions.
 */

/**
 * Returns whether given Campaign id is enabled for CampaignBot.
 */
module.exports.isCampaignBotCampaign = function (campaignId) {
  const ids = process.env.CAMPAIGNBOT_CAMPAIGNS;

  return ids.includes(campaignId);
};

module.exports.isValidZip = function (zip) {
  return /(^\d{5}$)|(^\d{5}-\d{4}$)/.test(zip);
};

module.exports.isValidEmail = function (email) {
  /* eslint-disable max-len */
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  /* eslint-enable max-len */

  return re.test(email);
};

module.exports.containsNaughtyWords = function (stringToBeCensored) {
  /* eslint-disable max-len */
  const naughtyWords = ['2g1c', '2girls 1 cup', 'acrotomophilia', 'anal', 'anilingus', 'anus', 'arsehole', 'asshole', 'assmunch', 'autoerotic', 'autoerotic', 'babeland', 'babybatter', 'ballgag', 'ballgravy', 'ballkicking', 'balllicking', 'ballsack', 'ballsucking', 'bangbros', 'bareback', 'barelylegal', 'barenaked', 'bastardo', 'bastinado', 'bbw', 'bdsm', 'beavercleaver', 'beaverlips', 'bestiality', 'bicurious', 'bigblack', 'bigbreasts', 'bigknockers', 'bigtits', 'bimbos', 'birdlock', 'bitch', 'blackcock', 'blondeaction', 'blondeon blonde action', 'blowj', 'blowyourl', 'bluewaffle', 'blumpkin', 'bollocks', 'bondage', 'boner', 'boob', 'boobs', 'bootycall', 'brownshowers', 'brunetteaction', 'bukkake', 'bulldyke', 'bulletvibe', 'bunghole', 'bunghole', 'busty', 'buttcheeks', 'butthole', 'cameltoe', 'camgirl', 'camslut', 'camwhore', 'carpetmuncher', 'carpetmuncher', 'chink', 'chocolaterosebuds', 'circlejerk', 'clevelandsteamer', 'clit', 'clitoris', 'cloverclamps', 'clusterfuck', 'cock', 'cocks', 'coprolagnia', 'coprophilia', 'cornhole', 'cumming', 'cunnilingus', 'cunt', 'darkie', 'daterape', 'daterape', 'deepthroat', 'deepthroat', 'dick', 'dildo', 'dirtypillows', 'dirtysanchez', 'doggiestyle', 'doggiestyle', 'doggystyle', 'doggystyle', 'dogstyle', 'dolcett', 'domination', 'dominatrix', 'dommes', 'donkeypunch', 'doubledong', 'doublepenetration', 'dpaction', 'eatmyass', 'ecchi', 'ejaculation', 'erotic', 'erotism', 'escort', 'ethicalslut', 'eunuch', 'faggot', 'fecal', 'felch', 'fellatio', 'feltch', 'femalesquirting', 'femdom', 'figging', 'fingering', 'fisting', 'footfetish', 'footjob', 'frotting', 'fuck', 'fuckbuttons', 'fudgepacker', 'fudgepacker', 'futanari', 'gangbang', 'gaysex', 'genitals', 'giantcock', 'girlon', 'girlontop', 'girlsgonewild', 'goatcx', 'goatse', 'gokkun', 'goldenshower', 'goodpoop', 'googirl', 'goregasm', 'grope', 'groupsex', 'g-spot', 'guro', 'handjob', 'handjob', 'hardcore', 'hardcore', 'hentai', 'homoerotic', 'honkey', 'hooker', 'hotchick', 'howto kill', 'howto murder', 'hugefat', 'humping', 'incest', 'intercourse', 'jackoff', 'jailbait', 'jailbait', 'jerkoff', 'jigaboo', 'jiggaboo', 'jiggerboo', 'jizz', 'juggs', 'kike', 'kinbaku', 'kinkster', 'kinky', 'knobbing', 'leatherrestraint', 'leatherstraight jacket', 'lemonparty', 'lolita', 'lovemaking', 'makeme come', 'malesquirting', 'masturbate', 'menagea trois', 'milf', 'missionaryposition', 'motherfucker', 'moundofvenus', 'mrhands', 'muffdiver', 'muffdiving', 'nambla', 'nawashi', 'negro', 'neonazi', 'nigga', 'nigger', 'nignog', 'nimphomania', 'nipple', 'nipples', 'nsfwimages', 'nude', 'nudity', 'nympho', 'nymphomania', 'octopussy', 'omorashi', 'onecuptwogirls', 'oneguyone jar', 'orgasm', 'orgy', 'paedophile', 'panties', 'panty', 'pedobear', 'pedophile', 'pegging', 'penis', 'phonesex', 'pieceofshit', 'pissing', 'pisspig', 'pisspig', 'playboy', 'pleasurechest', 'polesmoker', 'ponyplay', 'poof', 'poopchute', 'poopchute', 'porn', 'porno', 'pornography', 'princealbert piercing', 'pthc', 'pubes', 'pussy', 'queaf', 'raghead', 'ragingboner', 'rape', 'raping', 'rapist', 'rectum', 'reversecowgirl', 'rimjob', 'rimming', 'rosypalm', 'rosypalm and her 5 sisters', 'rustytrombone', 'sadism', 'scat', 'schlong', 'scissoring', 'semen', 'sex', 'sexo', 'sexy', 'shavedbeaver', 'shavedpussy', 'shemale', 'shibari', 'shit', 'shota', 'shrimping', 'slanteye', 'slut', 's&m', 'smut', 'snatch', 'snowballing', 'sodomize', 'sodomy', 'spic', 'spooge', 'spreadlegs', 'strapon', 'strapon', 'strappado', 'stripclub', 'styledoggy', 'suck', 'sucks', 'suicidegirls', 'sultrywomen', 'swastika', 'swinger', 'taintedlove', 'tastemy', 'teabagging', 'threesome', 'throating', 'tiedup', 'tightwhite', 'tit', 'tits', 'titties', 'titty', 'tongueina', 'topless', 'tosser', 'towelhead', 'tranny', 'tribadism', 'tubgirl', 'tubgirl', 'tushy', 'twat', 'twink', 'twinkie', 'twogirls one cup', 'undressing', 'upskirt', 'urethraplay', 'urophilia', 'vagina', 'venusmound', 'vibrator', 'violetblue', 'violetwand', 'vorarephilia', 'voyeur', 'vulva', 'wank', 'wetback', 'wetdream', 'whitepower', 'womenrapping', 'wrappingmen', 'wrinkledstarfish', 'xx', 'xxx', 'yaoi', 'yellowshowers', 'yiffy', 'zoophilia'];
  /* eslint-enable max-len */

  const noSpaceString = stringToBeCensored.toLowerCase().replace(/[^\w\s]/gi, '').replace(' ', '');

  // TODO: Rewrite to avoid using for loop.
  // @see https://github.com/airbnb/javascript#iterators-and-generators
  for (let i = 0; i < naughtyWords.length; i++) {
    if (noSpaceString.indexOf(naughtyWords[i]) !== -1) {
      return true;
    }
  }

  return false;
};

module.exports.getFirstWord = function (message) {
  if (!message) {
    return null;
  }
  const trimmed = message.trim();
  if (trimmed.indexOf(' ') >= 0) {
    return trimmed.substr(0, trimmed.indexOf(' '));
  }

  return trimmed;
};

module.exports.isYesResponse = function (message) {
  const trimmed = this.getFirstWord(message.toLowerCase().trim());
  const yesResponses = process.env.GAMBIT_YES_RESPONSES ?
    process.env.GAMBIT_YES_RESPONSES.toLowerCase().split(',') : ['yes'];

  return yesResponses.indexOf(trimmed) >= 0;
};

module.exports.hasLetters = function (message) {
  return RegExp(/[a-zA-Z]/g).test(message);
};


module.exports.generatePassword = function (text) {
  return crypto.createHmac('sha1', process.env.DS_API_PASSWORD_KEY)
    .update(text)
    .digest('hex')
    .substring(0, 6);
};

/**
 * Formats given Express response and sends an object including given message, with given code.
 * @param {object} res - Express response
 * @param {number} code - HTTP status code to return
 * @param {string} message - Message to include in response object.
 */
module.exports.sendResponse = function (res, code, message) {
  let type = 'success';
  if (code > 200) {
    type = 'error';
    logger.error(message);
  }

  const response = {};
  response[type] = { code, message };

  return res.status(code).send(response);
};
