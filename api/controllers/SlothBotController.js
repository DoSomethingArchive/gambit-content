'use strict';

/**
 * Imports.
 */
const logger = rootRequire('lib/logger');

/**
 * SlothBotController.
 */
class SlothBotController {

  /**
   * @param {object} req - Express request
   * @return {string}
   */
  renderResponseMessage(req) {
    const profile = req.body;
    logger.debug(`${profile.phone} sent slothbot:${profile.args}`);

    let msgTxt = '@slothbot: Thank you so much for talking to me. ';
    msgTxt += 'I just sit on an office couch all day. ';
    msgTxt += `You just told me:\n\n${profile.args}`;

    return msgTxt;
  }
}

module.exports = SlothBotController;
