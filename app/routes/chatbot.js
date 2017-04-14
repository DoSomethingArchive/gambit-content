'use strict';

/**
 * Imports.
 */
const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const logger = require('winston');

const CampaignBotController = require('../controllers/CampaignBotController');
const controller = new CampaignBotController();

const helpers = require('../../lib/helpers');
const contentful = require('../../lib/contentful');
const newrelic = require('newrelic');
const phoenix = require('../../lib/phoenix');
const stathat = require('../../lib/stathat');
const ClosedCampaignError = require('../exceptions/ClosedCampaignError');

// Models.
const BotRequest = require('../models/BotRequest');
const Signup = require('../models/Signup');
const User = require('../models/User');

/**
 * Determines if given incomingMessage matches given Gambit command type.
 */
function isCommand(incomingMessage, commandType) {
  logger.debug(`isCommand:${commandType}`);

  if (!incomingMessage) {
    return false;
  }

  const firstWord = helpers.getFirstWord(incomingMessage).toUpperCase();
  const configName = `GAMBIT_CMD_${commandType.toUpperCase()}`;
  const configValue = process.env[configName];
  const result = firstWord === configValue.toUpperCase();

  return result;
}

/**
 * Renders message for given message type and request.
 */
function renderMessageForMessageType(req, messageType) {
  newrelic.addCustomParameters({ gambitResponseMessageType: messageType });

  let messagePrefix = '';
  let renderMessageType = messageType;

  // Check if we're replying to inform user they've submitted invalid values for text fields.
  // If they did, ask for field again, setting messagePrefix to prepend to the rendered ask message.
  const invalidTextSentMessage = 'Sorry, I didn\'t understand that.\n\n';
  if (messageType === 'invalid_caption') {
    renderMessageType = 'ask_caption';
    messagePrefix = invalidTextSentMessage;
  } else if (messageType === 'invalid_why_participated') {
    renderMessageType = 'ask_caption';
    messagePrefix = invalidTextSentMessage;
  }

  return contentful.renderMessageForPhoenixCampaign(req.campaign, renderMessageType)
    .then((renderedMessage) => {
      let message = `${messagePrefix}${renderedMessage}`;

      // Possible for edge cases like closed campaign messages.
      if (!req.signup) {
        return helpers.addSenderPrefix(message);
      }

      let quantity = req.signup.total_quantity_submitted;
      if (req.signup.draft_reportback_submission) {
        quantity = req.signup.draft_reportback_submission.quantity;
      }
      if (quantity) {
        message = message.replace(/{{quantity}}/gi, quantity);
      }

      const revisiting = req.keyword && req.signup.draft_reportback_submission;
      if (revisiting) {
        const continuingMessage = 'Picking up where you left off on';
        const campaignTitle = req.campaign.title;
        message = `${continuingMessage} ${campaignTitle}...\n\n${message}`;
      }

      return helpers.addSenderPrefix(message);
    })
    .catch(err => err);
}

/**
 * Renders message for given messageType, sends it to continue conversation for current campaign.
 * Assumes we have a loaded req.user and req.campaign.
 */
function continueConversationWithMessageType(req, res, messageType) {
  let replyMessage;

  return renderMessageForMessageType(req, messageType)
    .then((message) => {
      replyMessage = message;

      // Store current campaign to continue conversation in subsequent messages.
      req.user.current_campaign = req.campaignId; // eslint-disable-line no-param-reassign

      return req.user.save();
    })
    .then(() => {
      logger.verbose(`saved user:${req.user._id} current_campaign:${req.campaignId}`);

      // todo: Promisify this POST request and only send back Gambit 200 on profile_update success.
      req.user.postMobileCommonsProfileUpdate(process.env.MOBILECOMMONS_OIP_CHATBOT, replyMessage);

      stathat.postStat(`campaignbot:${messageType}`);
      BotRequest.log(req, 'campaignbot', messageType, replyMessage);

      return helpers.sendResponse(res, 200, replyMessage);
    })
    .catch(err => helpers.sendErrorResponse(res, err));
}

/**
 * Sends given message to user to end conversation.
 */
function endConversationWithMessage(req, res, message) {
  // todo: Promisify this POST request and only send back Gambit 200 on profile_update success.
  req.user.postMobileCommonsProfileUpdate(process.env.MOBILECOMMONS_OIP_AGENTVIEW, message);

  return helpers.sendResponse(res, 200, message);
}

/**
 * Renders message for given messageType, then sends it to end conversation.
 */
function endConversationWithMessageType(req, res, messageType) {
  renderMessageForMessageType(req, messageType)
    .then((message) => {
      BotRequest.log(req, 'campaignbot', messageType, message);

      return endConversationWithMessage(req, res, message);
    })
    .catch(err => helpers.sendErrorResponse(res, err));
}

/**
 * Check for required config variables.
 */
router.use((req, res, next) => {
  const settings = [
    'GAMBIT_CMD_MEMBER_SUPPORT',
    'GAMBIT_CMD_REPORTBACK',
    'MOBILECOMMONS_OIP_AGENTVIEW',
    'MOBILECOMMONS_OIP_CHATBOT',
  ];
  let configured = true;
  settings.forEach((configVar) => {
    if (!process.env[configVar]) {
      const msg = `undefined process.env.${configVar}`;
      stathat.postStat(`error: ${msg}`);
      logger.error(msg);
      configured = false;
    }
  });
  if (!configured) {
    return res.sendStatus(500);
  }
  return next();
});

/**
 * Check for required body parameters and add/log helper variables.
 */
router.use((req, res, next) => {
  if (!req.body.phone) {
    return helpers.sendUnproccessibleEntityResponse(res, 'Missing required phone.');
  }
  if (!(req.body.keyword || req.body.args || req.body.mms_image_url)) {
    const msg = 'Missing required keyword, args, or mms_image_url.';
    return helpers.sendUnproccessibleEntityResponse(res, msg);
  }

  /* eslint-disable no-param-reassign */
  req.client = 'mobilecommons';
  req.incoming_message = req.body.args;
  req.incoming_image_url = req.body.mms_image_url;
  req.broadcast_id = req.body.broadcast_id;
  if (req.body.keyword) {
    req.keyword = req.body.keyword.toLowerCase();
  }
  /* eslint-enable no-param-reassign */

  const route = 'v1/chatbot';
  stathat.postStat(`route: ${route}`);
  // Compile body params for logging (Mobile Commons sends through more than we need to pay
  // attention to an incoming req.body).
  const incomingParams = {
    profile_id: req.body.profile_id,
    incoming_message: req.incoming_message,
    incoming_image_url: req.incoming_image_url,
    broadcast_id: req.broadcast_id,
    keyword: req.keyword,
  };
  logger.info(`${route} post:${JSON.stringify(incomingParams)}`);
  newrelic.addCustomParameters({
    incomingImageUrl: req.incoming_image_url,
    incomingMessage: req.incoming_message,
    keyword: req.keyword,
    mobileCommonsBroadcastId: req.broadcast_id,
    mobileCommonsMessageId: req.body.message_id,
    mobileCommonsProfileId: req.body.profile_id,
  });

  return next();
});

/**
 * Check if DS User exists for given mobile number.
 */
router.use((req, res, next) => {
  User.lookup('mobile', req.body.phone)
    .then((user) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }
      req.user = user; // eslint-disable-line no-param-reassign
      newrelic.addCustomParameters({ userId: user._id });

      return next();
    })
    .catch((err) => {
      if (err && err.status === 404) {
        if (req.timedout) {
          return helpers.sendTimeoutResponse(res);
        }
        logger.info(`User.lookup could not find mobile:${req.body.phone}`);

        return next();
      }

      return helpers.sendErrorResponse(res, err);
    });
});

/**
 * Create DS User for given mobile number if we didn't find one.
 */
router.use((req, res, next) => {
  if (req.user) {
    return next();
  }

  const data = {
    mobile: req.body.phone,
    mobilecommons_id: req.profile_id,
  };
  return User.post(data)
    .then((user) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }
      req.user = user; // eslint-disable-line no-param-reassign
      newrelic.addCustomParameters({ userId: user._id });

      return next();
    })
   .catch(err => helpers.sendErrorResponse(res, err));
});

/**
 * Check if the incoming request is a reply to a Broadcast, and set req.campaignId if User said yes.
 * Send the Broadcast Declined message if they said no.
 */
router.use((req, res, next) => {
  if (!req.broadcast_id) {
    return next();
  }

  return contentful.fetchBroadcast(req.broadcast_id)
    .then((broadcast) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }
      if (!broadcast) {
        return helpers.sendResponse(res, 404, `Broadcast ${req.broadcast_id} not found.`);
      }

      logger.info(`loaded broadcast:${req.broadcast_id} for user:${req.user._id}`);
      const saidNo = !(req.incoming_message && helpers.isYesResponse(req.incoming_message));
      if (saidNo) {
        logger.info(`user:${req.user._id} declined broadcast:${req.broadcast_id}`);

        const replyMessage = helpers.addSenderPrefix(broadcast.fields.declinedMessage);
        BotRequest.log(req, 'broadcast', 'prompt_declined', replyMessage);

        return endConversationWithMessage(req, res, replyMessage);
      }

      const broadcastCampaign = broadcast.fields.campaign.fields;
      req.campaignId = broadcastCampaign.campaignId; // eslint-disable-line no-param-reassign

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
});

/**
 * If we don't have a campaignId yet and incoming request contains a keyword, set the campaignId.
 */
router.use((req, res, next) => {
  if (req.campaignId || !req.keyword) {
    return next();
  }
  return contentful.fetchKeyword(req.keyword)
    .then((keyword) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }
      if (!keyword) {
        return helpers.sendResponse(res, 404, `Keyword ${req.keyword} not found.`);
      }
      if (keyword.fields.environment !== process.env.NODE_ENV) {
        const msg = `Keyword ${req.keyword} environment error: defined as ${keyword.environment} ` +
                    `but sent to ${process.env.NODE_ENV}.`;
        return helpers.sendResponse(res, 500, msg);
      }
      const keywordCampaign = keyword.fields.campaign.fields;
      req.campaignId = keywordCampaign.campaignId; // eslint-disable-line no-param-reassign

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
});

/**
 * If we still haven't set a campaignId, user already should be in a Campaign conversation.
 * @see continueConversationWithMessageType
 */
router.use((req, res, next) => {
  if (req.campaignId) {
    return next();
  }

  const campaignId = req.user.current_campaign;
  logger.debug(`user.current_campaign:${campaignId}`);

  if (!campaignId) {
    return helpers.sendResponse(res, 500, 'user.current_campaign undefined');
  }

  req.campaignId = campaignId; // eslint-disable-line no-param-reassign

  return next();
});

/**
 * Load Campaign from DS API.
 */
router.use((req, res, next) => {
  phoenix.fetchCampaign(req.campaignId)
    .then((campaign) => {
      req.campaign = campaign; // eslint-disable-line no-param-reassign
      newrelic.addCustomParameters({ campaignId: campaign.id });

      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }

      if (phoenix.isClosedCampaign(campaign)) {
        const err = new ClosedCampaignError(campaign);
        logger.warn(err.message);
        stathat.postStat(err.message);

        return endConversationWithMessageType(req, res, 'campaign_closed');
      }

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
});

/**
 * Check DS API for existing Signup.
 */
router.use((req, res, next) => {
  Signup.lookupCurrent(req.user, req.campaign)
    .then((signup) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }
      if (signup) {
        req.signup = signup; // eslint-disable-line no-param-reassign
      }

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
});

/**
 * If Signup wasn't found, post Signup to DS API.
 */
router.use((req, res, next) => {
  if (req.signup) {
    return next();
  }

  return Signup.post(req.user, req.campaign, req.keyword, req.broadcast_id)
    .then((signup) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }
      req.signup = signup; // eslint-disable-line no-param-reassign

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
});

/**
 * Sanity check: make sure there's a Signup.
 */
router.use((req, res, next) => {
  if (!req.signup) {
    return helpers.sendResponse(res, 500, 'req.signup is undefined');
  }

  logger.verbose(`user:${req.user._id} campaign:${req.campaign.id} signup:${req.signup._id}`);
  newrelic.addCustomParameters({ signupId: req.signup._id });

  return next();
});

/**
 * Check for non-reportback conversation messages first for sending reply message.
 */
router.post('/', (req, res, next) => {
  if (isCommand(req.incoming_message, 'member_support')) {
    return endConversationWithMessageType(req, res, 'member_support');
  }

  // If user is reporting back, skip to next.
  if (req.signup.draft_reportback_submission) {
    return next();
  }

  if (isCommand(req.incoming_message, 'reportback')) {
    return req.signup.createDraftReportbackSubmission()
      .then(() => continueConversationWithMessageType(req, res, 'ask_quantity'))
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  const isNewConversation = req.keyword || req.broadcast_id;

  // If member has completed this campaign:
  if (req.signup.reportback) {
    if (isNewConversation) {
      return continueConversationWithMessageType(req, res, 'menu_completed');
    }
    // Otherwise member didn't text back a Reportback or Member Support command.
    return continueConversationWithMessageType(req, res, 'invalid_cmd_completed');
  }

  if (isNewConversation) {
    return continueConversationWithMessageType(req, res, 'menu_signedup_gambit');
  }

  return continueConversationWithMessageType(req, res, 'invalid_cmd_signedup');
});

/**
 * Find message type to reply with based on current Reportback Submission and data submitted in req.
 */
router.post('/', (req, res) => {
  logger.debug(`draft_reportback_submission:${req.signup.draft_reportback_submission._id}`);

  return controller.continueReportbackSubmission(req)
    .then((messageType) => continueConversationWithMessageType(req, res, messageType))
    .catch(err => helpers.sendErrorResponse(res, err));
});

module.exports = router;
