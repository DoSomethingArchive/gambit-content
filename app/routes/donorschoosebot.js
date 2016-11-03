'use strict';

/**
 * Imports.
 */
const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const superagent = require('superagent');
const donorschoose = require('../../lib/donorschoose');
const helpers = require('../../lib/helpers');
const logger = app.locals.logger;

/**
 * Setup.
 */
const COUNT_FIELD = process.env.DONORSCHOOSE_DONATION_COUNT_FIELDNAME || 'ss2016_donation_count';
const MAX_DONATIONS_ALLOWED = (process.env.DONORSCHOOSE_MAX_DONATIONS_ALLOWED || 5);

function sendResponse(res, code, msgType, profileUpdate) {
  logger.debug(`dcbot sendResponse:${msgType} profileUpdate:${JSON.stringify(profileUpdate)}`);

  // TODO: Refactor to store donorsChooseBot instead of Controller once ready to drecpate.
  const bot = app.locals.controllers.donorsChooseBot.bot;
  const property = `msg_${msgType}`;
  // TODO: Post to Mobile Commons Profile

  return helpers.sendResponse(res, 200, bot[property]);
}

router.post('/', (req, res) => {
  let incomingMessage = req.body.args;
  if (!incomingMessage) {
    return helpers.sendResponse(res, 422, 'Missing required args.');
  }

  incomingMessage = helpers.getFirstWord(incomingMessage);
  logger.debug(`dcbot incomingMessage:${incomingMessage}`);

  const profileFieldName = `profile_${COUNT_FIELD}`;
  const numDonations = req.body[profileFieldName];

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

  const donationAmount = process.env.DONORSCHOOSE_DONATION_AMOUNT || 10;
  const olderThan = process.env.DONORSCHOOSE_PROPOSALS_OLDERTHAN;

  const apiKey = process.env.DONORSCHOOSE_API_KEY;
  const apiPassword = process.env.DONORSCHOOSE_API_PASSWORD;
  const donationsUri = `${donorschoose.getDonationsPostUrl()}?APIKey=${apiKey}`;

  let selectedProposal;
  const proposalsUri = `${process.env.DONORSCHOOSE_API_BASEURI}/common/json_feed.html`;
  const query = {
    // TODO: Fix -- This is throwing a 400 Bad error
    // costToCompleteRange: `${donationAmount}+TO+10000`,
    max: 1,
    olderThan,
    sortBy: 2,
    subject4: -4,
    zip: req.body.profile_postal_code,
  };

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

      // Submitting a Donation request first requires requesting a transaction token.
      // @see https://data.donorschoose.org/docs/transactions/
      return superagent.post(donationsUri)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .type('form')
        .send({
          APIKey: apiKey,
          apipassword: apiPassword,
          action: 'token',
        });
    })
    .then((response) => {
      const requestTokenResponse = JSON.parse(response.text);

      if (requestTokenResponse.statusDescription !== 'success') {
        throw new Error('DonorsChoose request token failed.');
      }
      logger.debug(`Request token success for donation to proposal:${selectedProposal.id}`);

      const donorEmail = process.env.DONORSCHOOSE_DEFAULT_EMAIL || 'donorschoose@dosomething.org';
      const data = {
        APIKey: apiKey,
        apipassword: apiPassword,
        action: 'donate',
        token: requestTokenResponse.token,
        proposalId: selectedProposal.id,
        amount: donationAmount,
        email: donorEmail,
        honoreeEmail: req.body.profile_email,
        honoreeFirst: req.body.profile_first_name,
      };

      return superagent.post(donationsUri)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .type('form')
        .send(data);
    })
    .then((response) => {
      const donation = JSON.parse(response.text);
      logger.debug(`Donation request created donation_id:${donation.donationId}`);

      const data = {
        mobile: req.body.phone,
        profile_email: req.body.profile_email,
        profile_first_name: req.body.profile_first_name,
        profile_postal_code: req.body.profile_postal_code,
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
      logger.debug(`stored donation ${donation.donation_id}`);

      return res.status(200).send(donation);
    })
    .catch(err => res.status(err.status).send(err.message));
});

module.exports = router;
