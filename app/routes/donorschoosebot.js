'use strict';

/**
 * Imports.
 */
const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const donorschoose = require('../../lib/donorschoose');
const helpers = require('../../lib/helpers');
const logger = app.locals.logger;

/**
 * Setup.
 */
const COUNT_FIELD = process.env.DONORSCHOOSE_DONATION_COUNT_FIELDNAME || 'ss2016_donation_count';
const MAX_DONATIONS_ALLOWED = (process.env.DONORSCHOOSE_MAX_DONATIONS_ALLOWED || 5);

/**
 * Sends response object and posts update to user's Mobile Commons Profile to send SMS message.
 * @param {object} res - Express response
 * @param {number} code - Response HTTP code to send
 * @param {string} msgType - The type of DonorsChooseBot message to send
 * @param {object} profileUpdate - field values to update on current User's Mobile Commons Profile
 */
function sendResponse(res, code, msgType, profileUpdate) {
  logger.debug(`dcbot sendResponse:${msgType} profileUpdate:${JSON.stringify(profileUpdate)}`);

  const property = `msg_${msgType}`;
  const responseMessage = app.locals.donorsChooseBot[property];
  // TODO: Post to Mobile Commons Profile

  return helpers.sendResponse(res, 200, responseMessage);
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
  let incomingMessage = req.body.args;
  if (!incomingMessage) {
    return helpers.sendResponse(res, 422, 'Missing required args.');
  }

  incomingMessage = helpers.getFirstWord(incomingMessage);
  logger.debug(`dcbot incomingMessage:${incomingMessage}`);

  const profileFieldName = `profile_${COUNT_FIELD}`;
  const numDonations = req.body[profileFieldName] ? Number(req.body[profileFieldName]) : 0;

  if (numDonations >= MAX_DONATIONS_ALLOWED) {
    return sendResponse(res, 200, 'max_donations_reached');
  }

  // If start param passed, initiate conversation, ignoring incomingMessage.
  const prompt = req.query.start;

  if (!req.body.profile_postal_code) {
    if (prompt) {
      return sendResponse(res, 200, 'ask_zip');
    }
    if (!helpers.isValidZip(incomingMessage)) {
      return sendResponse(res, 200, 'invalid_zip');
    }

    return sendResponse(res, 200, 'ask_first_name', { postal_code: incomingMessage });
  }

  if (!req.body.profile_first_name) {
    if (prompt) {
      return sendResponse(res, 200, 'ask_first_name');
    }
    if (helpers.containsNaughtyWords(incomingMessage) || !helpers.hasLetters(incomingMessage)) {
      return sendResponse(res, 200, 'invalid_first_name');
    }

    return sendResponse(res, 200, 'ask_email', { first_name: incomingMessage });
  }

  if (!req.body.profile_email) {
    if (prompt) {
      return sendResponse(res, 200, 'ask_email');
    }
    if (!helpers.isValidEmail(incomingMessage)) {
      return sendResponse(res, 200, 'invalid_email');
    }
  }

  // We've made it this far, time to donate.
  // TODO: When time to post to MC Profile, we'll need to save email if !req.body.profile_email.

  const apiKey = process.env.DONORSCHOOSE_API_KEY;
  const apiPassword = process.env.DONORSCHOOSE_API_PASSWORD;
  const proposalsUri = `${process.env.DONORSCHOOSE_API_BASEURI}/common/json_feed.html`;
  const secureBaseUri = process.env.DONORSCHOOSE_API_SECURE_BASEURI;
  const donationsUri = `${secureBaseUri}/common/json_api.html?APIKey=${apiKey}`;
  const donationAmount = process.env.DONORSCHOOSE_DONATION_AMOUNT || 10;
  const zip = req.body.profile_postal_code;

  const query = {
    // TODO: Fix -- This is throwing a 400 Bad error
    // costToCompleteRange: `${donationAmount}+TO+10000`,
    max: 1,
    olderThan: process.env.DONORSCHOOSE_PROPOSALS_OLDERTHAN,
    sortBy: process.env.DONORSCHOOSE_PROPOSALS_SORTBY || 2,
    subject4: process.env.DONORSCHOOSE_PROPOSALS_SUBJECT || -4,
    zip,
  };

  let selectedProposal;

  return donorschoose.get(proposalsUri, query)
    .then((response) => {
      if (response.proposals.length < 1) {
        logger.error(`'No proposals found for zip ${zip}`);
        // TODO: Inform User, either by throwing an error or adding a no projects found message.
      }

      return response.proposals[0];
    })
    .then((proposal) => {
      selectedProposal = donorschoose.decodeProposal(proposal);
      logger.debug(`DonorsChoose API found selectedProposal:${selectedProposal.id}`);

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
      logger.debug(tokenResponse);
      logger.debug(`DonorsChoose API token statusDescription:${tokenResponse.statusDescription}`);
      if (tokenResponse.statusDescription !== 'success') {
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
        honoreeEmail: req.body.profile_email,
        honoreeFirst: req.body.profile_first_name,
      };

      return donorschoose.post(donationsUri, data);
    })
    .then((donation) => {
      logger.debug(donation);
      logger.debug(`DonorsChoose API created donation_id:${donation.donationId}`);

      const data = {
        mobile: req.body.phone,
        profile_email: req.body.profile_email,
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
      };

      return app.locals.db.donorschoose_donations.create(data);
    })
    .then((donation) => {
      logger.debug(`stored donorschoose_donation:${donation.donation_id}`);

      return res.status(200).send(donation);
    })
    .catch(err => res.status(err.status).send(err.message));
});

module.exports = router;
