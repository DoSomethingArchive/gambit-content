'use strict';

/**
 * Imports.
 */
const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const logger = require('winston');
const Promise = require('bluebird');

const CampaignBotController = require('../controllers/CampaignBotController');
const controller = new CampaignBotController();

const helpers = require('../../lib/helpers');
const contentful = require('../../lib/contentful');
const newrelic = require('newrelic');
const mobilecommons = require('../../lib/mobilecommons');
const phoenix = require('../../lib/phoenix');
const stathat = require('../../lib/stathat');
const ClosedCampaignError = require('../exceptions/ClosedCampaignError');
const NotFoundError = require('../exceptions/NotFoundError');
// Models.
const BotRequest = require('../models/BotRequest');
const Signup = require('../models/Signup');
const User = require('../models/User');

const agentViewOip = process.env.MOBILECOMMONS_OIP_AGENTVIEW;

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
  // TODO: Define this in app.locals to DRY with routes/signups?
  req.oip = process.env.MOBILECOMMONS_OIP_CHATBOT;
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
        BotRequest.log(req, 'broadcast', null, 'prompt_declined', replyMessage);
        // TODO: Promisify send_message and return 200 when we know message delivery successful.
        mobilecommons.send_message(req.user.mobile, replyMessage);

        return helpers.sendResponse(res, 200, replyMessage);
      }

      const broadcastCampaign = broadcast.fields.campaign.fields;
      req.campaignId = broadcastCampaign.campaignId; // eslint-disable-line no-param-reassign

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
});

router.post('/', (req, res) => {
  phoenix.fetchCampaign(req.campaignId)
    .then((phoenixCampaign) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }
      // Temporary success for now.
      return res.send(phoenixCampaign);
    })
    .catch(err => helpers.sendErrorResponse(res, err));
});

/**
 * Posts to chatbot route will find or create a Northstar User for the given req.body.phone.
 * Currently only supports Mobile Commons mData's.
 */
router.post('/', (req, res) => {
  const scope = req;

  const loadCampaign = new Promise((resolve, reject) => {
    logger.log('loadCampaign');

    if (scope.keyword) {
      return contentful.fetchKeyword(scope.keyword)
        .then((keyword) => {
          if (!keyword) {
            const err = new NotFoundError(`keyword ${scope.keyword} not found`);
            return reject(err);
          }
          logger.debug(`found keyword:${JSON.stringify(keyword.fields)}`);

          if (keyword.fields.environment !== process.env.NODE_ENV) {
            let msg = `mData misconfiguration: ${keyword.environment} keyword sent to`;
            msg = `${msg} ${process.env.NODE_ENV}`;
            const err = new Error(msg);
            return reject(err);
          }
          const campaignId = keyword.fields.campaign.fields.campaignId;
          logger.debug(`keyword campaignId:${campaignId}`);

          return phoenix.fetchCampaign(campaignId);
        })
        .then((campaign) => {
          if (!campaign.id) {
            const msg = `Campaign not found for keyword '${scope.keyword}'.`;
            const err = new NotFoundError(msg);
            return reject(err);
          }
          logger.debug(`found campaign:${campaign.id}`);

          return resolve(campaign);
        })
        .catch(err => reject(err));
    }

    // If we've made it this far, check for User's current_campaign.
    logger.debug(`user.current_campaign:${req.user.current_campaign}`);
    // TODO: Check if current_campaign is undefined before fetching.
    return phoenix.fetchCampaign(req.user.current_campaign)
      .then((campaign) => {
        if (!campaign.id) {
          // TODO: Send to non-existent start menu to select a campaign.
          const user = req.user;
          const msg = `User:${user._id} undefined current_campaign:${user.current_campaign}`;
          const err = new NotFoundError(msg);

          return reject(err);
        }

        return resolve(campaign);
      })
      .catch(err => reject(err));
  });

  return loadCampaign
    .then((campaign) => {
      scope.campaign = campaign;
      newrelic.addCustomParameters({ campaignId: campaign.id });

      if (phoenix.isClosedCampaign(campaign)) {
        throw new ClosedCampaignError(campaign);
      }

      return Signup.lookupCurrent(scope.user, scope.campaign);
    })
    .then((currentSignup) => {
      if (currentSignup) {
        logger.debug(`Signup.lookupCurrent found signup:${currentSignup._id}`);

        return currentSignup;
      }
      logger.debug('Signup.lookupCurrent not find signup');

      return Signup.post(scope.user, scope.campaign, scope.keyword);
    })
    .then((signup) => {
      logger.info(`loaded signup:${signup._id.toString()}`);
      scope.signup = signup;
      newrelic.addCustomParameters({ signupId: signup._id });

      if (!scope.signup) {
        // TODO: Handle this edge-case.
        logger.error('signup undefined');
        return false;
      }

      if (scope.broadcast_id) {
        scope.signup.broadcast_id = scope.broadcast_id;
        scope.signup.save().catch((err) => logger.error('Error saving broadcast id', err.message));
      }

      if (isCommand(scope.incoming_message, 'member_support')) {
        scope.cmd_member_support = true;
        scope.oip = agentViewOip;
        return 'member_support';
      }

      if (scope.signup.draft_reportback_submission) {
        logger.debug(`draft_reportback_submission:${scope.signup.draft_reportback_submission._id}`);
        return controller.continueReportbackSubmission(scope);
      }

      if (isCommand(scope.incoming_message, 'reportback')) {
        return scope.signup.createDraftReportbackSubmission().then(() => 'ask_quantity');
      }

      if (scope.signup.reportback) {
        if (scope.keyword || scope.broadcast_id) {
          return 'menu_completed';
        }
        // If we're this far, member didn't text back Reportback or Member Support commands.
        return 'invalid_cmd_completed';
      }

      if (scope.keyword || scope.broadcast_id) {
        return 'menu_signedup_gambit';
      }

      return 'invalid_cmd_signedup';
    })
    .then((msgType) => {
      // This is hacky, CampaignBotController.postReportback returns error that isn't caught.
      // TODO: Clean this up when ready to take on https://github.com/DoSomething/gambit/issues/744.
      if (msgType instanceof Error) {
        throw new Error(msgType.message);
      }

      scope.msg_type = msgType;
      // TODO: Add config variable for invalid text input copy.
      scope.msg_prefix = 'Sorry, I didn\'t understand that.\n\n';

      if (scope.msg_type === 'invalid_caption') {
        scope.msg_type = 'ask_caption';
      } else if (scope.msg_type === 'invalid_why_participated') {
        scope.msg_type = 'ask_why_participated';
      } else {
        scope.msg_prefix = '';
      }
      return contentful.renderMessageForPhoenixCampaign(scope.campaign, scope.msg_type);
    })
    .then((renderedMessage) => {
      scope.response_message = `${scope.msg_prefix} ${renderedMessage}`;
      newrelic.addCustomParameters({ gambitResponseMessageType: scope.msg_type });

      let quantity = req.signup.total_quantity_submitted;
      if (req.signup.draft_reportback_submission) {
        quantity = req.signup.draft_reportback_submission.quantity;
      }
      scope.response_message = scope.response_message.replace(/{{quantity}}/gi, quantity);
      const revisiting = req.keyword && req.signup.draft_reportback_submission;
      if (revisiting) {
        // TODO: Add config variable for continue draft message copy.
        const continueMsg = 'Picking up where you left off on';
        const campaignTitle = scope.campaign.title;
        scope.response_message = `${continueMsg} ${campaignTitle}...\n\n${scope.response_message}`;
      }
      // Save to continue conversation with future mData requests that don't contain a keyword.
      scope.user.current_campaign = scope.campaign.id;

      return scope.user.save();
    })
    .then(() => {
      scope.response_message = helpers.addSenderPrefix(scope.response_message);
      logger.debug(`saved user.current_campaign:${scope.campaign.id}`);
      scope.user.postMobileCommonsProfileUpdate(scope.oip, scope.response_message);
      helpers.sendResponse(res, 200, scope.response_message);
      stathat.postStat(`campaignbot:${scope.msg_type}`);

      return BotRequest.log(req, 'campaignbot', null, scope.msg_type, scope.response_message);
    })
    .then(botRequest => logger.debug(`created botRequest:${botRequest._id}`))
    .catch(NotFoundError, (err) => {
      logger.error(err.message);

      return helpers.sendResponse(res, 404, err.message);
    })
    .catch(ClosedCampaignError, (err) => {
      logger.warn(err.message);
      stathat.postStat('campaign closed');

      return contentful.renderMessageForPhoenixCampaign(scope.campaign, 'campaign_closed')
        .then((responseMessage) => {
          scope.response_message = helpers.addSenderPrefix(responseMessage);
          // Send to Agent View for now until we get a Select Campaign menu up and running.
          scope.user.postMobileCommonsProfileUpdate(agentViewOip, scope.response_message);

          return helpers.sendResponse(res, 200, scope.response_message);
        })
        .catch(renderError => helpers.sendResponse(res, 500, renderError.message));
    })
    .catch(err => {
      if (err.message === 'broadcast declined') {
        logger.info('broadcast declined');
        scope.response_message = scope.broadcast.fields.declinedMessage;
        if (!scope.response_message) {
          const logMsg = 'undefined broadcast.declinedMessage';
          logger.error(logMsg);
          stathat.postStat(`error: ${logMsg}`);

          // Don't send an error code to Mobile Commons, which would trigger error message to User.
          return helpers.sendResponse(res, 200, logMsg);
        }
        const msg = helpers.addSenderPrefix(scope.response_message);
        // Log the no response:
        BotRequest.log(req, 'broadcast', null, 'prompt_declined', msg);
        // Send broadcast declined using Mobile Commons Send Message API:
        mobilecommons.send_message(scope.user.mobile, msg);

        return helpers.sendResponse(res, 200, msg);
      }

      stathat.postStat(err.message);
      let errStatus = err.status;
      if (!errStatus) {
        errStatus = 500;
      }

      return helpers.sendResponse(res, errStatus, err.message);
    });
});

module.exports = router;
