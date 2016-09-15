# Chatbot

## Chat

```
POST /v1/chatbot
```
Receives requests from MobileCommons Chatbot mData's and sends User a response 
over SMS (via posting to Mobile Commons API to send relevant message to User).

**Headers**

Name | Type | Description
--- | --- | ---
`x-gambit-api-key` | `string` | **Required.** Used to authenticate POST requests.

**Parameters**

Name | Type | Description
--- | --- | ---
`bot_type` | `string` | Type of bot to chat with, expected values: `campaignbot`, 
`donorschoosebot` or `slothbot`. Defaults to `slothbot`
`campaign` | `integer` | Required when `bot_type=campaign`, used to load Campaign from Phoenix API
`start` | `boolean` | If set, the bot will begin a new conversation. Default: `false`

**Input**

Name | Type | Description
--- | --- | ---
`phone` | `string` | **Required.** Our member's mobile number.
`args` | `string` | An incoming message the member has sent.
`profile_first_name` | `string` | 
`profile_email` | `string` | 
`profile_northstar_id` | `string` | Used by CampaignBot to load User - @todo Create Northstar User if no value exists
`profile_postal_code` | `string` | 
`profile_ss2016_donation_count` | `string` | Used by `donorschoose` bots to limit # of donations. This parameter name can be changed by `DONORSCHOOSE_DONATION_FIELDNAME`


## Sync

```
POST /v1/chatbot/chat
```
Queries Gambit-Jr. API to update the corresponding Mongo `config` collection 
documents with the latest content for the given `bot_type`.


**Headers**

Name | Type | Description
--- | --- | ---
`x-gambit-api-key` | `string` | **Required.** Used to authenticate POST requests.

**Parameters**

Name | Type | Description
--- | --- | ---
`bot_type` | `string` | Type of bot to sync, expected values: `campaignbot` or 
`donorschoosebot` 
