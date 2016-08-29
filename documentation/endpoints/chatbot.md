# Chatbot

Currently hard-wired for usage in our Mobile Commons account to chat over SMS.

```
POST /v1/chatbot
```

**Parameters**

Name | Type | Description
--- | --- | ---
`bot_type` | `string` | Type of bot to chat with, `donorschoose` or `slothbot`. Default: `slothbot`
`start` | `boolean` | If set, the bot will begin a new conversation. Default: `false`

**Input**

Name | Type | Description
--- | --- | ---
`phone` | `string` | **Required.** Our member's mobile number.
`args` | `string` | An incoming message the member has sent.
`profile_first_name` | `string` | 
`profile_email` | `string` | 
`profile_postal_code` | `string` | 
`profile_ss2016_donation_count` | `string` | Used by `donorschoose` bots to limit # of donations. This parameter name can be changed by `DONORSCHOOSE_DONATION_FIELDNAME`

