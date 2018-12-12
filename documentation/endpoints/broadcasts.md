# Broadcasts

Broadcast messages sent to users.

Fields:

Name | Type | Description
-----|------|------------
`id` | String | The Contentful entry id
`name` | String | Internal name used to reference the broadcast
`type` | String | The Contentful entry type, e.g. `askYesNo`, `autoReplyBroadcast`, `broadcast`
`message` | Object | Contains the [outbound message content](https://github.com/DoSomething/gambit-conversations/blob/master/documentation/endpoints/messages.md) to send to user
`message.text` | String |
`message.attachments` | Array |
`message.template` | String |
`message.topic` | Object | Optional. If is set, the id saved to the [conversation topic](https://github.com/DoSomething/gambit-campaigns/blob/master/documentation/endpoints/topics.md) when user receives the message. Otherwise the topic is set to this broadcast id.
`templates` | Object | Provides replies for when this broadcast is saved for a [conversation topic](https://github.com/DoSomething/gambit-campaigns/blob/master/documentation/endpoints/topics.md) -- used in `askYesNo`, which will update the conversation topic again if user answers yes

Legacy fields (only used for type `broadcast`)

Name | Type | Description
-----|------|------------
`topic` | String | (Legacy) If set, updates the conversation topic to this string.*
`campaignId` | Number | (Legacy) If set, updates the conversation topic to the given campaign's topic.*



## Retrieve broadcasts

```
GET /v1/broadcasts
```

Returns broadcasts.

### Query parameters

Name | Type | Description
-----|------|------------
`limit` | Number | Number of results to retrieve
`skip` | Number | Number of results to skip

<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/broadcasts?skip=20
  -H "Accept: application/json"
  -H "Content-Type: application/json"
```

</p></details>

<details><summary>**Example Response**</summary><p>
  
```
{
  "data": [
    {
      "id": "2pdZ69lVukaEw2MM8gcEOg",
      "name": "VoterRegistration2018_Jul10_MissouriPrimaryReminder",
      "type": "broadcast",
      "createdAt": "2018-07-10T13:43:15.338Z",
      "updatedAt": "2018-07-10T13:44:12.830Z",
      "message": {
        "text": "It's Freddie! Guess what -- Missouri needs YOU. Voters have the power to make a huge difference in your state, so make sure you're registered to vote in Missouri's primary before tonight's deadline! It takes just 2 mins: https://vote.dosomething.org/?r=user:{{user.id}},campaignID:8017,campaignRunID:8022,source:sms,source_details:broadcastID_2pdZ69lVukaEw2MM8gcEOg",
        "attachments": [],
        "template": "rivescript"
      },
      "campaignId": null,
      "topic": "survey_response"
    },
    {
      "id": "2X4r3fZrTGA2mGemowgiEI",
      "name": "askYesNo test",
      "type": "askYesNo",
      "createdAt": "2018-08-06T23:34:56.395Z",
      "updatedAt": "2018-08-08T22:20:14.822Z",
      "message": {
        "text": "Join Pump it Up? \n\nYes No",
        "attachments": [],
        "template": "askYesNo",
        "topic": {}
      },
    "templates": {
      "saidYes": {
        "text": "Great! Text START to submit a photo.",
        "topic": {
          "id": "4xXe9sQqmIeiWauSUu6kAY",
          "name": "Pump It Up - Submit Flyer",
          "type": "photoPostConfig",
          "createdAt": "2018-08-01T14:41:30.242Z",
          "updatedAt": "2018-08-13T13:31:32.583Z",
          "postType": "photo",
          "campaign": { ... },
          "templates": {
            ...
          }
        },
        "saidNo": {
          "text": "Ok, we'll check in with you later.",
          "topic": {
            "id": "61RPZx8atiGyeoeaqsckOE",
            "name": "Generic autoReply",
            "type": "autoReply",
            "createdAt": "2018-08-07T17:43:06.893Z",
            "updatedAt": "2018-08-13T18:08:16.056Z",
            "campaign": {},
            "templates": {
              "autoReply": {
                "text": "Sorry, I didn't understand that. Text Q if you have a question.",
                "topic": {}
              }
            }
          }
        },
        "invalidAskYesNoResponse": {
          "text": "Sorry, I didn't get that - did you want to join for Pump It Up? Yes or No",
          "topic": {}
        },
      },
    },
    ...
  },
  "meta": {
    "pagination": {
      "total": 573,
      "skip": 20,
      "limit": 100
    }
  }
}
```

</p></details>


## Retrieve broadcast

```
GET /v1/broadcasts/:id
```

Returns a broadcast.

### Query parameters

Name | Type | Description
-----|------|------------
`cache` | string | If set to `false`, fetches broadcast from Contentful and resets cache.

<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/broadcasts/2HdYviqiK46skcgKW6OSGk?cache=false
  -H "Accept: application/json"
  -H "Content-Type: application/json"
```

</p></details>

<details><summary>**Example Response**</summary><p>
  
```
{
  "data": {
    "id": "2HdYviqiK46skcgKW6OSGk",
    "name": "VoterRegistration2018_Jun27_Pending_TestG",
    "type": "broadcast",
    "createdAt": "2018-06-27T16:53:41.058Z",
    "updatedAt": "2018-06-27T16:54:34.766Z",
    "message": {
      "text": "It's Freddie from DoSomething. There's an election coming up in Nov. I wanna hear from you. Tell me: What issue do you want to see Americans vote for this year?",
      "attachments": [],
      "template": "askText"
    },
    "campaignId": 7059,
    "topic": null
  }
}
```

</p></details>
