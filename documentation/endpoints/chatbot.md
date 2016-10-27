# Chatbot

Our Mobile Commons Chatbot mData will POST here to send the message a User texted to the DoSomething shortcode. Gambit determines how to respond to the message, and delivers a SMS response back to User 
by posting the response message to a Custom Field on their Mobile Commons Profile.

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
Parameter names are defined by the data included in a Mobile Commons mData POST request.

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

<details>
<summary>**Example Request**</summary>
````
curl -X "POST" "http://localhost:5000/v1/chatbot" \
     -H "x-gambit-api-key: totallysecret" \
     -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" \
     --data-urlencode "phone=5555555511" \
     --data-urlencode "profile_northstar_id=5547be89469c64ec7d8b518d" \
     --data-urlencode "keyword=slothieboi"
````
</details>

<details>
<summary>**Example Response**</summary>
````
{
  "message":  "Picking up where you left off on Yeah Science...\n\nSweet! First, what's the total number of products you shipped?\r\n\r\nSend the exact number back."
}
````
</details>
