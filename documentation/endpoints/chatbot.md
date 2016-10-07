# Chatbot

## Chat

```
POST /v1/chatbot
```
We set up mData's in Mobile Commons that post to our `chatbot` endpoint. Each request body from Mobile Commons contains information about our current User (their phone number, first name, and all other Mobile Commons profile fields).

Gambit determines what response to send to the incoming request and responds to the User by posting the message to send to our Mobile Commons `profile_update` API endpoint,  delivering the message over SMS .

**Headers**

Name | Type | Description
--- | --- | ---
`x-gambit-api-key` | `string` | **Required.** Used to authenticate POST requests.

**Parameters**

Name | Type | Description
--- | --- | ---
`bot_type` | `string` | Type of bot to chat with if not CampaignBot, our default. Possible values: `donorschoosebot`, `slothbot`
`start` | `boolean` | If set, the bot will begin a new DonorsChoose conversation if `bot_type=donorschoose`. Default: `false`

**Input**

Name | Type | Description
--- | --- | ---
`phone` | `string` | **Required.** Our member's mobile number.
`args` | `string` | An incoming message the member has sent.
`keyword` | `string` | If set, it's the Mobile Commons keyword that posted to this endpoint.
`profile_first_name` | `string` | 
`profile_email` | `string` | 
`profile_northstar_id` | `string` | Used by CampaignBot to load User - [@todo Create Northstar User if no value exists](https://github.com/DoSomething/gambit/issues/636)
`profile_postal_code` | `string` | 
`profile_ss2016_donation_count` | `string` | Used by `donorschoose` bots to limit # of donations. This parameter name can be changed by `DONORSCHOOSE_DONATION_FIELDNAME`
