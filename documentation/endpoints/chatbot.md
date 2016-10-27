# Chatbot

```
POST /v1/chatbot
```

**Headers**

Name | Type | Description
--- | --- | ---
`x-gambit-api-key` | `string` | **Required.**

**Parameters**

Name | Type | Description
--- | --- | ---
`bot_type` | `string` | Defaults to `campaignbot`, accepts `donorschoosebot`
`start` | `boolean` | If set, the bot will begin a new DonorsChoose conversation if `bot_type=donorschoose`. Default: `false`

**Input**

***Mobile Commons***

Params from incoming [Mobile Commons](https://github.com/DoSomething/gambit/wiki/Chatbot#networking) mData requests.

Name | Type | Description
--- | --- | ---
`phone` | `string` | **Required.** Our member's mobile number.
`args` | `string` | Incoming message the member has sent.
`keyword` | `string` | [Mobile Commons keyword](https://github.com/DoSomething/gambit/wiki/Chatbot#mdata) that the triggered incoming Mobile Commons mData request.
`mms_image_url` | `string` | URL of incoming image member as has sent.
`profile_first_name` | `string` | 
`profile_email` | `string` | 
`profile_northstar_id` | `string` | 
`profile_postal_code` | `string` | 
`profile_ss2016_donation_count` | `string` | Used by `donorschoose` bots to limit # of donations. This parameter name can be changed by `DONORSCHOOSE_DONATION_FIELDNAME`

***Quicksilver***

Params from incoming [Quicksilver](https://github.com/DoSomething/gambit/wiki/Chatbot#quicksilver) requests.

Name | Type | Description
--- | --- | ---
`signup_id` | `number` | DS Signup ID to update Gambit cache for
`signup_source` | `string` | Required if `signup_id` is set