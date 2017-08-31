# Receive Message

Receives an inbound message forwarded from the Gambit Conversations API to create or update a User's Signup for the given `campaignId`. 

```
POST /v1/receive-message
```

**Headers**

Name | Type | Description
--- | --- | ---
`x-gambit-api-key` | `string` | **Required.**
`x-blink-retry-count` | `number` | If set, number of times [Blink](github.com/dosomething/blink) has retried this request.

**Input**


Name | Type | Description
--- | --- | ---
`phone` | `string` | **Required.** Mobile number that sent incoming message.
`campaignId` | `string` | **Required.** Mobile number that sent incoming message.
`text` | `string` | Incoming text sent.
`mediaUrl` | `string` | Incoming image sent.
`keyword` | `string` | Campaign Signup keyword, if triggered
`broadcastId` | `string` | Broadcast ID, if User is responding to a Broadcast

<details><summary>**Example Request**</summary><p>

```
curl -X "POST" "http://localhost:5000/v1/chatbot" \
     -H "x-gambit-api-key: totallysecret" \
     -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" \
     --data-urlencode "phone=5555555511" \
     --data-urlencode "text=I love rock and roll"
     --data-urlencode "campaignId=7" \
```

</p></details>

<details><summary>**Example Response**</summary><p>

```
{
  "success": {
    "code": 200,
    "message": "Nice job! YOU deserve a Mirror Message for all the notes you posted. We've got you down for 97 messages posted. Have you posted more? Text START.",
    "template": "completedMenuMessage"
  }
}
```

</p></details>
