'use strict';

// Third party modules
const newrelic = require('newrelic');
const express = require('express');
const logger = require('winston');

// Application modules
const helpers = require('../../lib/helpers');
const contentful = require('../../lib/contentful');
const phoenix = require('../../lib/phoenix');
const stathat = require('../../lib/stathat');
const ClosedCampaignError = require('../exceptions/ClosedCampaignError');

// config modules
const requiredParamsConf = require('../../config/middleware/chatbot/required-params');
const userIncomingMessageConf = require('../../config/middleware/chatbot/user-incoming-message');
const mapParamsConf = require('../../config/middleware/chatbot/map-request-params');

// Middleware
const requiredParamsMiddleware = require('../../lib/middleware/required-params');
const userIncomingMessageMiddleware = require('../../lib/middleware/user-incoming-message');
const mapRequestParamsMiddleware = require('../../lib/middleware/map-request-params');
const lookUpUserMiddleware = require('../../lib/middleware/user-get');
const createNewUserIfNotFoundMiddleware = require('../../lib/middleware/user-create');
const processBroadcastConversationMiddleware = require('../../lib/middleware/broadcast');

// Router
const router = express.Router(); // eslint-disable-line new-cap

// Models.
const BotRequest = require('../models/BotRequest');
const Signup = require('../models/Signup');

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
    renderMessageType = 'ask_why_participated';
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
      req.user.postDashbotOutgoing(messageType);

      stathat.postStat(`campaignbot:${messageType}`);
      BotRequest.log(req, 'campaignbot', messageType, replyMessage);

      return helpers.sendResponse(res, 200, replyMessage);
    })
    .catch(err => helpers.sendErrorResponse(res, err));
}

/**
 * Renders message for given messageType, then sends it to end conversation.
 */
function endConversationWithMessageType(req, res, messageType) {
  renderMessageForMessageType(req, messageType)
    .then((message) => {
      BotRequest.log(req, 'campaignbot', messageType, message);
      stathat.postStat(`campaignbot:${messageType}`);
      req.user.postDashbotOutgoing(messageType);

      return helpers.endConversationWithMessage(req, res, message);
    })
    .catch(err => helpers.sendErrorResponse(res, err));
}

/**
 * Ends conversation with Error Occurred Message, suppressing Blink retries for given request.
 */
function endConversationWithError(req, res, error) {
  const messageType = 'error_occurred';

  return renderMessageForMessageType(req, messageType)
    .then((message) => {
      // todo: Promisify this POST request and only send back Gambit 200 on profile_update success.
      req.user.postMobileCommonsProfileUpdate(process.env.MOBILECOMMONS_OIP_AGENTVIEW, message);
      stathat.postStat(`campaignbot:${messageType}`);
      req.user.postDashbotOutgoing(messageType);

      newrelic.addCustomParameters({ blinkSuppressRetry: true });
      res.setHeader('x-blink-retry-suppress', true);

      return helpers.sendErrorResponse(res, error);
    })
    .catch(err => helpers.sendErrorResponse(res, err));
}

/**
 * Handles a Phoenix POST error, calling endConversationWithError if we shouldn't retry.
 */
function handlePhoenixPostError(req, res, err) {
  if (err.message.includes('API response is false')) {
    return endConversationWithError(req, res, err);
  }

  return helpers.sendErrorResponse(res, err);
}

/**
 * Check for required body parameters and add/log helper variables.
 */
router.use(requiredParamsMiddleware(requiredParamsConf));
router.use(userIncomingMessageMiddleware(userIncomingMessageConf));
router.use(mapRequestParamsMiddleware(mapParamsConf));

/**
 * Check if DS User exists for given mobile number.
 */
router.use(lookUpUserMiddleware());

/**
 * Create DS User for given mobile number if we didn't find one.
 */
router.use(createNewUserIfNotFoundMiddleware());

router.use(processBroadcastConversationMiddleware());

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
    .catch(err => handlePhoenixPostError(req, res, err));
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
  if (helpers.isCommand(req.incoming_message, 'member_support')) {
    return endConversationWithMessageType(req, res, 'member_support');
  }

  req.isNewConversation = req.keyword || req.broadcast_id; // eslint-disable-line no-param-reassign

  // If user is reporting back, skip to next.
  if (req.signup.draft_reportback_submission) {
    return next();
  }

  if (helpers.isCommand(req.incoming_message, 'reportback')) {
    return req.signup.createDraftReportbackSubmission()
      .then(() => continueConversationWithMessageType(req, res, 'ask_quantity'))
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  // If member has completed this campaign:
  if (req.signup.reportback) {
    if (req.isNewConversation) {
      return continueConversationWithMessageType(req, res, 'menu_completed');
    }
    // Otherwise member didn't text back a Reportback or Member Support command.
    return continueConversationWithMessageType(req, res, 'invalid_cmd_completed');
  }

  if (req.isNewConversation) {
    return continueConversationWithMessageType(req, res, 'menu_signedup_gambit');
  }

  return continueConversationWithMessageType(req, res, 'invalid_cmd_signedup');
});

/**
 * Find message type to reply with based on current Reportback Submission and data submitted in req.
 */
router.post('/', (req, res, next) => {
  const draft = req.signup.draft_reportback_submission;
  const input = req.incoming_message;
  logger.debug(`draft_reportback_submission:${draft._id}`);

  if (!draft.quantity) {
    if (req.isNewConversation) {
      return continueConversationWithMessageType(req, res, 'ask_quantity');
    }
    if (!helpers.isValidReportbackQuantity(input)) {
      return continueConversationWithMessageType(req, res, 'invalid_quantity');
    }

    draft.quantity = Number(input);

    return draft.save()
      .then(() => continueConversationWithMessageType(req, res, 'ask_photo'))
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  if (!draft.photo) {
    if (req.isNewConversation) {
      return continueConversationWithMessageType(req, res, 'ask_photo');
    }
    if (!req.incoming_image_url) {
      return continueConversationWithMessageType(req, res, 'no_photo_sent');
    }

    draft.photo = req.incoming_image_url;

    return draft.save()
      .then(() => continueConversationWithMessageType(req, res, 'ask_caption'))
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  if (!draft.caption) {
    if (req.isNewConversation) {
      return continueConversationWithMessageType(req, res, 'ask_caption');
    }
    if (!helpers.isValidReportbackText(input)) {
      return continueConversationWithMessageType(req, res, 'invalid_caption');
    }

    draft.caption = helpers.trimReportbackText(input);

    return draft.save()
      .then(() => {
        // If member hasn't submitted a reportback yet, ask for why_participated.
        if (!req.signup.total_quantity_submitted) {
          return continueConversationWithMessageType(req, res, 'ask_why_participated');
        }

        // Otherwise skip to post reportback to DS API.
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  if (!draft.why_participated) {
    if (req.isNewConversation) {
      return continueConversationWithMessageType(req, res, 'ask_why_participated');
    }
    if (!helpers.isValidReportbackText(input)) {
      return continueConversationWithMessageType(req, res, 'invalid_why_participated');
    }

    draft.why_participated = helpers.trimReportbackText(input);

    return draft.save()
      .then(() => next())
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  return next();
});

/**
 * If we've made it this far, time to submit the completed draft reportback submission.
 */
router.post('/', (req, res) => {
  req.signup.postDraftReportbackSubmission()
    .then(() => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }

      return continueConversationWithMessageType(req, res, 'menu_completed');
    })
    .catch(err => handlePhoenixPostError(req, res, err));
});

module.exports = router;
