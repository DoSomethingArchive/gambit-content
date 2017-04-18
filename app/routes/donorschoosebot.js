'use strict';

/**
 * Imports.
 */
const express = require('express');

const router = express.Router(); // eslint-disable-line new-cap
const logger = require('winston');

const donorschoose = require('../../lib/donorschoose');
const mobilecommons = require('../../lib/mobilecommons');
const helpers = require('../../lib/helpers');
const stathat = require('../../lib/stathat');
const DonorsChooseDonation = require('../models/DonorsChooseDonation');

function debug(req, message) {
  logger.debug(`donorschoosebot profile:${req.body.profile_id} ${message}`);
}

function error(req, message) {
  logger.error(`donorschoosebot profile:${req.body.profile_id} ${message}`);
}

function info(req, message) {
  logger.info(`donorschoosebot profile:${req.body.profile_id} ${message}`);
}

/**
 * Sends response object and posts update to user's Mobile Commons Profile to send SMS message.
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {number} code - Response HTTP code to send
 * @param {string} msgType - The type of DonorsChooseBot message to send
 */
function sendResponse(req, res, code, msgType) {
  debug(req, `sendResponse:${msgType}`);
  const scope = req;
  const responseMessage = app.locals.donorsChooseBot.renderMessage(req, msgType);
  scope.profile_update.gambit_chatbot_response = helpers.addSenderPrefix(responseMessage);
  const profile = req.body;
  mobilecommons.profile_update(profile.profile_id, profile.phone, scope.oip, scope.profile_update);

  return helpers.sendResponse(res, code, scope.profile_update.gambit_chatbot_response);
}

/**
 * This route was built for the Science Sleuth SMS Game on Mobile Commons, where the final game OIP
 * triggers an mData that posts here, to donate to DonorsChoose project on behalf of the player.
 *
 * DonorsChooseBot asks for the sender's zip code, first name, and email to post a donation to the
 * DonorsChoose API, donating to the first project it finds closest to the sender's zip code.
 *
 * If the Mobile Commons Profile doesn't have a value saved for zip, first name, or email, we send
 * a message back to the User prompting for it (and a 200 response back to Mobile Commons, since we
 * know how to respond the sender's message and have posted to their profile to respond by SMS).
 *
 * DonorsChooseBot was the predecessor to CampaignBot - we didn't have models or DS API integration.
 * We use the incoming Mobile Commons Profile to retreive required info for the sender, and post to
 * it to update it with their email, zip, first name, and a custom field to keep donation count.
 */
router.post('/', (req, res) => {
  stathat.postStat('route: v1/donorschoosebot');

  let incomingMessage = req.body.args;
  const scope = req;
  // Currently only support mobilecommons.
  scope.client = 'mobilecommons';
  // Initialize object to store profile data to save when posting Mobile Commons profile_update API.
  scope.profile_update = {};

  // Opt user into chat OIP by default.
  scope.oip = process.env.MOBILECOMMONS_OIP_DONORSCHOOSEBOT;
  const agentViewOip = process.env.MOBILECOMMONS_OIP_DONORSCHOOSEBOT_END;

  incomingMessage = helpers.getFirstWord(incomingMessage);
  debug(req, `incomingMessage:${incomingMessage}`);

  const countField = process.env.DONORSCHOOSE_DONATION_COUNT_FIELDNAME || 'ss2016_donation_count';
  const profileFieldName = `profile_${countField}`;
  const numDonations = req.body[profileFieldName] ? Number(req.body[profileFieldName]) : 0;
  const maxDonationsAllowed = (process.env.DONORSCHOOSE_MAX_DONATIONS_ALLOWED || 5);

  if (numDonations >= maxDonationsAllowed) {
    scope.oip = agentViewOip;

    return sendResponse(scope, res, 200, 'max_donations_reached');
  }

  // If start param passed, initiate conversation, ignoring incomingMessage.
  const prompt = req.query.start;

  if (!req.body.profile_postal_code) {
    debug(req, 'profile_postal_code undefined');

    if (prompt) {
      return sendResponse(scope, res, 200, 'ask_zip');
    }

    const validate = incomingMessage && helpers.isValidZip(incomingMessage);
    if (!validate) {
      return sendResponse(scope, res, 200, 'invalid_zip');
    }

    scope.profile_update.postal_code = incomingMessage;

    return sendResponse(scope, res, 200, 'ask_first_name');
  }

  if (!req.body.profile_first_name) {
    debug(req, 'profile_first_name undefined');

    if (prompt) {
      return sendResponse(scope, res, 200, 'ask_first_name');
    }

    let validate = incomingMessage && helpers.hasLetters(incomingMessage);
    validate = validate && !helpers.containsNaughtyWords(incomingMessage);
    if (!validate) {
      return sendResponse(scope, res, 200, 'invalid_first_name');
    }

    scope.profile_update.first_name = incomingMessage;

    return sendResponse(scope, res, 200, 'ask_email');
  }

  if (!req.body.profile_email) {
    debug(req, 'profile_email undefined');

    if (prompt) {
      return sendResponse(scope, res, 200, 'ask_email');
    }

    const validate = incomingMessage && helpers.isValidEmail(incomingMessage);
    if (!validate) {
      return sendResponse(scope, res, 200, 'invalid_email');
    }

    const email = incomingMessage.toLowerCase();
    scope.profile_update.email = email;
    // Save to body for later when we create a Donation document.
    scope.body.profile_email = email;
  }

  // We've got all required profile fields -- time to donate.
  const zip = req.body.profile_postal_code;
  const apiKey = process.env.DONORSCHOOSE_API_KEY;
  const apiPassword = process.env.DONORSCHOOSE_API_PASSWORD;
  const proposalsUri = `${process.env.DONORSCHOOSE_API_BASEURI}/common/json_feed.html`;
  const secureBaseUri = process.env.DONORSCHOOSE_API_SECURE_BASEURI;
  const donationsUri = `${secureBaseUri}/common/json_api.html?APIKey=${apiKey}`;
  const donationAmount = process.env.DONORSCHOOSE_DONATION_AMOUNT || 10;
  const sortBy = process.env.DONORSCHOOSE_PROPOSALS_SORTBY || 2;
  const subjectCode = process.env.DONORSCHOOSE_PROPOSALS_SUBJECT_CODE || -4;

  // Define query as a string, defining as an object causes costToCompleteRange to throw 400 error.
  let query = `costToCompleteRange=${donationAmount}+TO+10000&max=1&zip=${zip}`;
  query = `${query}&sortBy=${sortBy}&subject4=${subjectCode}`;

  // If query doesn't return any results, check on DONORSCHOOSE_PROPOSALS_OLDERTHAN value stored.
  // @see https://github.com/DoSomething/gambit/pull/545
  if (process.env.DONORSCHOOSE_PROPOSALS_OLDERTHAN) {
    query = `${query}&olderThan=${process.env.DONORSCHOOSE_PROPOSALS_OLDERTHAN}`;
  }

  let selectedProposal;

  return donorschoose.get(proposalsUri, query)
    .then((response) => {
      if (response.proposals.length < 1) {
        error(req, `no search results for zip:${zip}`);
        throw new Error('no search results');
      }

      return response.proposals[0];
    })
    .then((proposal) => {
      selectedProposal = donorschoose.decodeProposal(proposal);
      debug(req, `found selectedProposal:${selectedProposal.id}`);

      // Submitting a Donation request first requires requesting a transaction token.
      // @see https://data.donorschoose.org/docs/transactions/
      const data = {
        APIKey: apiKey,
        apipassword: apiPassword,
        action: 'token',
      };

      return donorschoose.post(donationsUri, data);
    })
    .then((tokenResponse) => {
      debug(req, `token.statusDescription:${tokenResponse.statusDescription}`);
      if (tokenResponse.statusDescription !== 'success') {
        stathat.postStat(`donorschoose: POST token ${tokenResponse.statusDescription}`);

        throw new Error('DonorsChoose API request for token failed.');
      }

      const donorEmail = process.env.DONORSCHOOSE_DEFAULT_EMAIL || 'donorschoose@dosomething.org';
      const data = {
        APIKey: apiKey,
        apipassword: apiPassword,
        action: 'donate',
        token: tokenResponse.token,
        proposalId: selectedProposal.id,
        amount: donationAmount,
        email: donorEmail,
        honoreeEmail: scope.body.profile_email,
        honoreeFirst: req.body.profile_first_name,
      };

      return donorschoose.post(donationsUri, data);
    })
    .then((donation) => {
      stathat.postStat('donorschoose: POST donation 200');
      info(req, `created donation_id:${donation.donationId}`);

      const data = {
        mobile: req.body.phone,
        profile_email: scope.body.profile_email,
        profile_first_name: req.body.profile_first_name,
        profile_postal_code: zip,
        donation_id: donation.donationId,
        donation_amount: donationAmount,
        proposal_id: selectedProposal.id,
        proposal_remaining_amount: donation.remainingProposalAmount,
        proposal_url: selectedProposal.url,
        school_name: selectedProposal.schoolName,
        school_city: selectedProposal.city,
        school_state: selectedProposal.state,
        teacher_name: selectedProposal.teacherName,
        proposal_description: selectedProposal.fulfillmentTrailer,
      };

      return DonorsChooseDonation.create(data);
    })
    .then((donation) => {
      info(req, `stored donorschoose_donation:${donation.donation_id}`);
      scope.donation = donation;
      scope.profile_update[countField] = numDonations + 1;
      scope.oip = agentViewOip;

      return sendResponse(scope, res, 200, 'donation_confirmation');
    })
    .catch((err) => {
      if (err.message === 'no search results') {
        stathat.postStat('donorschoose: no projects found');
        scope.oip = process.env.MOBILECOMMONS_OIP_DONORSCHOOSEBOT_ERROR;

        return sendResponse(scope, res, 200, 'search_no_results');
      }

      stathat.postStat(`donorschoose: error ${err.message}`);
      error(req, err.message);

      return res.status(500).send(err.message);
    });
});

module.exports = router;
