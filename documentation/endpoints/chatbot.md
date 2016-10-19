# Chatbot

```
POST /v1/chatbot
```
Currently only implemented in [Mobile Commons](https://github.com/DoSomething/gambit/wiki/Chatbot#networking).

**Headers**

Name | Type | Description
--- | --- | ---
`x-gambit-api-key` | `string` | **Required.** Used to authenticate POST requests.

**Parameters**

Name | Type | Description
--- | --- | ---
`bot_type` | `string` | Can set to `donorschoosebot`, otherwise defaults to `campaignbot`.
`start` | `boolean` | If set, the bot will begin a new DonorsChoose conversation if `bot_type=donorschoose`. Default: `false`

**Input**

Name | Type | Description
--- | --- | ---
`phone` | `string` | **Required.** Our member's mobile number.
`args` | `string` | An incoming message the member has sent.
`keyword` | `string` | If set, it's the [Mobile Commons keyword](https://github.com/DoSomething/gambit/wiki/Chatbot#mdata) that the sender's incoming message triggered.
`profile_first_name` | `string` | 
`profile_email` | `string` | 
`profile_northstar_id` | `string` | 
`profile_postal_code` | `string` | 
`profile_ss2016_donation_count` | `string` | Used by `donorschoose` bots to limit # of donations. This parameter name can be changed by `DONORSCHOOSE_DONATION_FIELDNAME`
