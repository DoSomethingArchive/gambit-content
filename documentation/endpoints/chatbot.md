# Chatbot

Currently only implemented for use by a Mobile Commons mData POST request.

```
POST /v1/chatbot
```

**Headers**

Name | Type | Description
--- | --- | ---
`x-gambit-api-key` | `string` | **Required.**
`x-blink-retry-count` | `number` | If set, number of times [Blink](github.com/dosomething/blink) has retried this request.

**Input**

Field names are defined by the data included in a Mobile Commons mData POST request.

Name | Type | Description
--- | --- | ---
`phone` | `string` | **Required.** Mobile number that sent incoming message.
`args` | `string` | Incoming text sent.
`mms_image_url` | `string` | Incoming image sent.
`keyword` | `string` | Mobile Commons keyword that triggered the incoming mData POST.
`profile_id` | `number` | Mobile Commons Profile ID
`broadcast_id` | `number` | Mobile Commons Broadcast ID, if User is responding to a Broadcast

<details><summary>**Example Request**</summary><p>

```
curl -X "POST" "http://localhost:5000/v1/chatbot" \
     -H "x-gambit-api-key: totallysecret" \
     -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" \
     --data-urlencode "phone=5555555511" \
     --data-urlencode "keyword=slothieboi"
     --data-urlencode "profile_id=136122001" \
```

</p></details>

<details><summary>**Example Response**</summary><p>

```
{
  "success": {
    "code": 200,
    "message": "Picking up where you left off on Bumble Bands...\n\nSend your best pic of you and the 33 bumble bands you created.",
    "template": "askPhotoMessage"
  }
}
```

</p></details>
