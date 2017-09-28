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
`userId` | `string` | **Required.** Northstar Id of User that sent incoming message.
`campaignId` | `string` | **Required.** Campaign User has signed up for.
`text` | `string` | Incoming text sent.
`mediaUrl` | `string` | Incoming image sent.
`keyword` | `string` | Campaign Signup keyword, if triggered
`broadcastId` | `string` | Broadcast ID, if User is responding to a Broadcast

<details><summary>**Example Request**</summary><p>

```
curl -X "POST" "http://localhost:5000/v1/chatbot" \
     -H "x-gambit-api-key: totallysecret" \
     -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" \
     --data-urlencode "userId=59abca4200707d62db575a3b" \
     --data-urlencode "text=I love rock and roll"
     --data-urlencode "campaignId=7" \
```

</p></details>

<details><summary>**Example Response**</summary><p>

```
{
  "data": {
    "signup": {
      "id": 4037166,
      "campaign": {
        "id": 6620
      },
      "keyword": "dunkbot",
      "reportback": 4037166,
      "totalQuantitySubmitted": 44,
      "draftReportbackSubmission": {
        "quantity": 453,
        "id": "59cd56554fc8e92a6ce84b1c",
        "createdAt": "2017-09-28T20:06:04.711Z"
      },
      "user": {
        "id": "59cd4c1910707d778633e30f"
      }
    },
    "reply": {
      "text": "@dev Nice! Send your best pic of you and the 453 dunks you done.",
      "template": "askPhoto"
    }
  }
}

```

</p></details>
