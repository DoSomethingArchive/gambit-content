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
`broadcast` | `boolean` | If set, inspects User's sent message as either Yes or No response to Signup for whatever the `CAMPAIGNBOT_BROADCAST_CAMPAIGN` config var is set to.


**Input**

Field names are defined by the data included in a Mobile Commons mData POST request.

Name | Type | Description
--- | --- | ---
`phone` | `string` | **Required.** Mobile number that sent incoming message.
`args` | `string` | Incoming text sent.
`mms_image_url` | `string` | Incoming image sent.
`keyword` | `string` | [Mobile Commons keyword](https://github.com/DoSomething/gambit/wiki/Chatbot#mdata) that triggered the incoming mData POST.
`profile_id` | `number` | Mobile Commons Profile ID

<details>
<summary>**Example Request**</summary>
````
curl -X "POST" "http://localhost:5000/v1/chatbot" \
     -H "x-gambit-api-key: totallysecret" \
     -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" \
     --data-urlencode "phone=5555555511" \
     --data-urlencode "keyword=slothieboi"
     --data-urlencode "profile_id=136122001" \
````
</details>

<details>
<summary>**Example Response**</summary>
````
{
  "success": {
    "code": 200,
    "message": "Picking up where you left off on Bumble Bands...\n\nSend your best pic of you and the 33 bumble bands you created."
  }
}
````
</details>
