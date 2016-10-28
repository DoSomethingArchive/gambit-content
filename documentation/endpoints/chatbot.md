# Chatbot

Currently only implemented for use by a Mobile Commons mData POST request.

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
Field names are defined by the data included in a Mobile Commons mData POST request.

Name | Type | Description
--- | --- | ---
`phone` | `string` | **Required.** Mobile number that sent incoming message.
`args` | `string` | Incoming text sent.
`mms_image_url` | `string` | Incoming image sent.
`keyword` | `string` | [Mobile Commons keyword](https://github.com/DoSomething/gambit/wiki/Chatbot#mdata) that the triggered incoming Mobile Commons mData request.
`profile_first_name` | `string` | Only used by `donorschoosebot`
`profile_email` | `string` | Only used by `donorschoosebot`
`profile_postal_code` | `string` |  Only used by `donorschoosebot`
`profile_ss2016_donation_count` | `string` | Only used by `donorschoosebot` to store # of donations. This parameter name can be changed by `DONORSCHOOSE_DONATION_FIELDNAME`

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
