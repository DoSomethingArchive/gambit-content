/**
 * Configuration for a Donors Choose donation flow.
 *
 * @todo Configs should be migrated into a MongoDB collection instead.
 */

var config = {
  "101": {
    "__comments": "Science Sleuth 2014 EndGame Donation Flow",
    "start_donation_flow" : 170621,
    "invalid_state_oip": 172545,
    "invalid_zip_oip": 172543,
    "found_project_ask_name": 170623,
    "received_name_ask_email": 170625,
    "donate_complete": 170627
  }
};

module.exports = config;