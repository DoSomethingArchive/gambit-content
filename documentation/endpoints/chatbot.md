# Chatbot

Currently hard-wired for usage in our Mobile Commons account to chat over SMS.

```
POST /v1/chatbot
```

**Headers**

Name | Type | Description
--- | --- | ---
`x-gambit-api-key` | `string` | **Required.** Used to authenticate POST requests.

**Parameters**

Name | Type | Description
--- | --- | ---
`bot_type` | `string` | Type of bot to chat with, `campaign`, `donorschoose` or `slothbot`. Default: `slothbot`
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

