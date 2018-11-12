# Campaign Activity

Receives data from Gambit Conversations that has been parsed as activity for a given User and Cmapaign.

```
POST /v1/campaignActivity
```

**Headers**

Name | Type | Description
--- | --- | ---
`x-gambit-api-key` | `string` | **Required.**
`x-blink-retry-count` | `number` | If set, number of times [Blink](github.com/dosomething/blink) has retried this request.

**Input**


Name | Type | Description
--- | --- | ---
`userId` | `string` | **Required.** 
`campaignId` | `string` | **Required.** Campaign that the User has signed up for.
`postType` | `string` |  Optional -- type of campaign post to submit (when set to `text`) or begin (when set to `photo`) 
`platform` | `string` | **Required.** Platform that message was sent from.
`text` | `string` | Message text.
`mediaUrl` | `string` | Message media URL.
`keyword` | `string` | Campaign keyword, if User sent a keyword
`broadcastId` | `string` | Broadcast Id, if User is responding to a Broadcast

<details><summary>**Example Request**</summary><p>

```
curl -X "POST" "http://localhost:5000/v1/campaignActivity"
     -H "x-gambit-api-key: totallysecret"
     -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8"
     --data-urlencode "userId=59cd4c1910707d778633e30f"
     --data-urlencode "text=I love rock and roll"
     --data-urlencode "postType=text"
     --data-urlencode "platform=alexa"
     --data-urlencode "campaignRunId=8873"
     --data-urlencode "campaignId=6620"
```

</p></details>

<details><summary>**Example Response**</summary><p>

```
{
  "data": {
    "replyTemplate": "invalidCompletedMenuCommand",
    "signup": {
      "id": 4037166,
      "campaign": {
        "id": 6620
      },
      "user": {
        "id": "59cd4c1910707d778633e30f"
      },
      "keyword": "dunkbot",
      "reportback": {
        "id": 4037166
      },
      "totalQuantitySubmitted": 4
    }
  }
}
```

</p></details>
