'use strict';

/**
 * Imports.
 */
const crypto = require('crypto');
const logger = require('winston');
const contentful = require('./contentful');
const stathat = require('./stathat');

// Default limit in seconds before requests timeout
const DEFAULT_TIMEOUT_NUM_SECONDS = 15;

/**
 * Prepends the Sender Prefix config variable if it exists.
 */
module.exports.addSenderPrefix = function (string) {
  const senderPrefix = process.env.GAMBIT_CHATBOT_RESPONSE_PREFIX;
  if (!senderPrefix) {
    return string;
  }

  return `${senderPrefix} ${string}`;
};


module.exports.containsNaughtyWords = function (stringToBeCensored) {
  const naughtyWords = ['2g1c', '2girls 1 cup', 'acrotomophilia', 'anal', 'anilingus', 'anus', 'arsehole', 'asshole', 'assmunch', 'autoerotic', 'autoerotic', 'babeland', 'babybatter', 'ballgag', 'ballgravy', 'ballkicking', 'balllicking', 'ballsack', 'ballsucking', 'bangbros', 'bareback', 'barelylegal', 'barenaked', 'bastardo', 'bastinado', 'bbw', 'bdsm', 'beavercleaver', 'beaverlips', 'bestiality', 'bicurious', 'bigblack', 'bigbreasts', 'bigknockers', 'bigtits', 'bimbos', 'birdlock', 'bitch', 'blackcock', 'blondeaction', 'blondeon blonde action', 'blowj', 'blowyourl', 'bluewaffle', 'blumpkin', 'bollocks', 'bondage', 'boner', 'boob', 'boobs', 'bootycall', 'brownshowers', 'brunetteaction', 'bukkake', 'bulldyke', 'bulletvibe', 'bunghole', 'bunghole', 'busty', 'buttcheeks', 'butthole', 'cameltoe', 'camgirl', 'camslut', 'camwhore', 'carpetmuncher', 'carpetmuncher', 'chink', 'chocolaterosebuds', 'circlejerk', 'clevelandsteamer', 'clit', 'clitoris', 'cloverclamps', 'clusterfuck', 'cock', 'cocks', 'coprolagnia', 'coprophilia', 'cornhole', 'cumming', 'cunnilingus', 'cunt', 'darkie', 'daterape', 'daterape', 'deepthroat', 'deepthroat', 'dick', 'dildo', 'dirtypillows', 'dirtysanchez', 'doggiestyle', 'doggiestyle', 'doggystyle', 'doggystyle', 'dogstyle', 'dolcett', 'domination', 'dominatrix', 'dommes', 'donkeypunch', 'doubledong', 'doublepenetration', 'dpaction', 'eatmyass', 'ecchi', 'ejaculation', 'erotic', 'erotism', 'escort', 'ethicalslut', 'eunuch', 'faggot', 'fecal', 'felch', 'fellatio', 'feltch', 'femalesquirting', 'femdom', 'figging', 'fingering', 'fisting', 'footfetish', 'footjob', 'frotting', 'fuck', 'fuckbuttons', 'fudgepacker', 'fudgepacker', 'futanari', 'gangbang', 'gaysex', 'genitals', 'giantcock', 'girlon', 'girlontop', 'girlsgonewild', 'goatcx', 'goatse', 'gokkun', 'goldenshower', 'goodpoop', 'googirl', 'goregasm', 'grope', 'groupsex', 'g-spot', 'guro', 'handjob', 'handjob', 'hardcore', 'hardcore', 'hentai', 'homoerotic', 'honkey', 'hooker', 'hotchick', 'howto kill', 'howto murder', 'hugefat', 'humping', 'incest', 'intercourse', 'jackoff', 'jailbait', 'jailbait', 'jerkoff', 'jigaboo', 'jiggaboo', 'jiggerboo', 'jizz', 'juggs', 'kike', 'kinbaku', 'kinkster', 'kinky', 'knobbing', 'leatherrestraint', 'leatherstraight jacket', 'lemonparty', 'lolita', 'lovemaking', 'makeme come', 'malesquirting', 'masturbate', 'menagea trois', 'milf', 'missionaryposition', 'motherfucker', 'moundofvenus', 'mrhands', 'muffdiver', 'muffdiving', 'nambla', 'nawashi', 'negro', 'neonazi', 'nigga', 'nigger', 'nignog', 'nimphomania', 'nipple', 'nipples', 'nsfwimages', 'nude', 'nudity', 'nympho', 'nymphomania', 'octopussy', 'omorashi', 'onecuptwogirls', 'oneguyone jar', 'orgasm', 'orgy', 'paedophile', 'panties', 'panty', 'pedo', 'pedobear', 'pedophile', 'pegging', 'penis', 'phonesex', 'pieceofshit', 'pissing', 'pisspig', 'pisspig', 'playboy', 'pleasurechest', 'polesmoker', 'ponyplay', 'poof', 'poopchute', 'poopchute', 'porn', 'porno', 'pornography', 'princealbert piercing', 'pthc', 'pubes', 'pussy', 'queaf', 'raghead', 'ragingboner', 'rape', 'raping', 'rapist', 'rectum', 'reversecowgirl', 'rimjob', 'rimming', 'rosypalm', 'rosypalm and her 5 sisters', 'rustytrombone', 'sadism', 'scat', 'schlong', 'scissoring', 'semen', 'sex', 'sexo', 'sexy', 'shavedbeaver', 'shavedpussy', 'shemale', 'shibari', 'shit', 'shota', 'shrimping', 'slanteye', 'slut', 's&m', 'smut', 'snatch', 'snowballing', 'sodomize', 'sodomy', 'spic', 'spooge', 'spreadlegs', 'strapon', 'strapon', 'strappado', 'stripclub', 'styledoggy', 'suck', 'sucks', 'suicidegirls', 'sultrywomen', 'swastika', 'swinger', 'taintedlove', 'tastemy', 'teabagging', 'threesome', 'throating', 'tiedup', 'tightwhite', 'tit', 'tits', 'titties', 'titty', 'tongueina', 'topless', 'tosser', 'towelhead', 'tranny', 'tribadism', 'tubgirl', 'tubgirl', 'tushy', 'twat', 'twink', 'twinkie', 'twogirls one cup', 'undressing', 'upskirt', 'urethraplay', 'urophilia', 'vagina', 'venusmound', 'vibrator', 'violetblue', 'violetwand', 'vorarephilia', 'voyeur', 'vulva', 'wank', 'wetback', 'wetdream', 'whitepower', 'womenrapping', 'wrappingmen', 'wrinkledstarfish', 'xx', 'xxx', 'yaoi', 'yellowshowers', 'yiffy', 'zoophilia'];

  const noSpaceString = stringToBeCensored.toLowerCase().replace(/[^\w\s]/gi, '').replace(' ', '');
  const found = [];

  naughtyWords.forEach((word) => {
    if (noSpaceString.indexOf(word) !== -1) {
      found.push(word);
    }
  });

  return !!found.length;
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
  const trimmedMsg = message.toLowerCase().trim();
  const yesResponses = process.env.GAMBIT_YES_RESPONSES ?
    process.env.GAMBIT_YES_RESPONSES.toLowerCase().split(',') : ['yes'];

  const matchRegex = new RegExp(`^(${yesResponses.join('|')})$`);

  return !!trimmedMsg.match(matchRegex);
};

module.exports.hasLetters = function (message) {
  return RegExp(/[a-zA-Z]/g).test(message);
};

/**
 * Checks if given input string contains a valid Reportback quantity.
 * @param {string} input
 * @return {boolean}
 */
module.exports.isValidReportbackQuantity = function (input) {
  // TODO: Make this much better!
  // @see https://github.com/DoSomething/gambit/issues/608
  return (Number(input) && !this.hasLetters(input));
};

/**
 * Checks if given input string contains a valid Reportback text field.
 * @param {string} input
 * @return {boolean}
 */
module.exports.isValidReportbackText = function (input) {
  return !!(input && input.trim().length > 3 && this.hasLetters(input));
};

module.exports.generatePassword = function (text) {
  return crypto.createHmac('sha1', process.env.DS_API_PASSWORD_KEY)
    .update(text)
    .digest('hex')
    .substring(0, 6);
};

/**
 * Replaces given input string with variables from given phoenixCampaign and signupKeyword.
 */
module.exports.replacePhoenixCampaignVars = function (input, phoenixCampaign, signupKeyword) {
  return new Promise((resolve, reject) => {
    logger.debug(`helpers.replacePhoenixCampaignVars campaignId:${phoenixCampaign.id}`);
    if (!input) {
      return resolve('');
    }

    let scope = input;

    try {
      scope = scope.replace(/{{title}}/gi, phoenixCampaign.title);
      scope = scope.replace(/{{tagline}}/i, phoenixCampaign.tagline);
      scope = scope.replace(/{{fact_problem}}/gi, phoenixCampaign.facts.problem);
      const reportbackInfo = phoenixCampaign.reportbackInfo;
      scope = scope.replace(/{{rb_noun}}/gi, reportbackInfo.noun);
      scope = scope.replace(/{{rb_verb}}/gi, reportbackInfo.verb);
      scope = scope.replace(/{{rb_confirmation_msg}}/i, reportbackInfo.confirmationMessage);
      scope = scope.replace(/{{cmd_reportback}}/i, process.env.GAMBIT_CMD_REPORTBACK);
      scope = scope.replace(/{{cmd_member_support}}/i, process.env.GAMBIT_CMD_MEMBER_SUPPORT);
      if (scope.indexOf('{{keyword}}') === -1) {
        return resolve(scope);
      }
    } catch (err) { return reject(err); }

    /*
    * TODO: Why is this branch here?
    * There seems to be no code that makes the function take this path
    * Is this here just for testing or future manual override?
    */
    if (signupKeyword) {
      scope = scope.replace(/{{keyword}}/i, signupKeyword);
      return resolve(scope);
    }

    // If we've made it this far, we need to render a keyword by finding the first keyword
    // for the Campaign defined in Contentful.
    return contentful.fetchKeywordsForCampaignId(phoenixCampaign.id)
      .then((keywords) => {
        // Note: We might want to add a "primary" boolean to denote which keyword should be used
        // as the default keyword when there are multiple. For now, we'll return the first to KISS.
        const keyword = keywords[0].keyword;
        scope = scope.replace(/{{keyword}}/i, keyword);

        return resolve(scope);
      })
      .catch(err => reject(err));
  });
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
    stathat.postStat(`${code}: ${message}`);
  }

  const response = {};
  response[type] = { code, message };

  return res.status(code).send(response);
};

/**
 * Returns number of seconds to use for Gambit timeout setting.
 * @return {number}
 */
module.exports.getGambitTimeoutNumSeconds = function () {
  return Number(process.env.GAMBIT_TIMEOUT_NUM_SECONDS) || DEFAULT_TIMEOUT_NUM_SECONDS;
};

/**
 * Sends response object for a Gambit timeout.
 * @param {object} res - Express response
 */
module.exports.sendTimeoutResponse = function (res) {
  const timeoutNumSeconds = this.getGambitTimeoutNumSeconds();

  return this.sendResponse(res, 504, `Request timed out after ${timeoutNumSeconds} seconds.`);
};

module.exports.sendErrorResponse = function (res, err) {
  let status = err.status;
  if (!status) {
    status = 500;
  }

  return this.sendResponse(res, status, err.message);
};

/**
 * Sends a 422 with given message.
 * @param {object} res - Express response
 * @param {object} message - Express response
 */
module.exports.sendUnproccessibleEntityResponse = function (res, message) {
  return this.sendResponse(res, 422, message);
};

/**
 * Returns object of options to pass to mongoose.findOneAndUpdate to upsert a document.
 */
module.exports.upsertOptions = function () {
  const options = {
    upsert: true,
    new: true,
  };

  return options;
};


/**
 * Determines if given incomingMessage matches given Gambit command type.
 */
module.exports.isCommand = function isCommand(incomingMessage, commandType) {
  logger.debug(`isCommand:${commandType}`);

  if (!incomingMessage) {
    return false;
  }

  const firstWord = this.getFirstWord(incomingMessage).toUpperCase();
  const configName = `GAMBIT_CMD_${commandType.toUpperCase()}`;
  const configValue = process.env[configName];
  const result = firstWord === configValue.toUpperCase();

  return result;
};
