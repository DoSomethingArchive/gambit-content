# Broadcasts

Broadcast messages sent to users.

Fields:

Name | Type | Description
-----|------|------------
`id` | String | The Contentful entry id
`name` | String | Internal name used to reference the broadcast
`message` | Object | Broadcast message content. See the Gambit Conversations messages endpoint for details.
`topic` | String | If set, updates the conversation topic to this string.
`campaignId` | Number | If set, updates the conversation topic to the given campaign's topic.


## Retrieve broadcasts

```
GET /v1/broadcasts
```

Returns broadcasts.

### Query parameters

Name | Type | Description
-----|------|------------
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
      "id": "4C2gkDV8oUAaewSMYeokEC",
      "name": "VoterRegistration2018_Jul8_OhioSpecialHouseGeneralReminder",
      "createdAt": "2018-07-06T18:28:51.478Z",
      "updatedAt": "2018-07-06T18:31:55.968Z",
      "message": {
        "text": "It's Freddie! Guess what -- Ohio needs YOU. Voters have the power to make a huge difference in your state, so make sure you're registered to vote in Ohio's special house general election before tonight's deadline! It takes just 2 mins: https://vote.dosomething.org/?r=user:{{user.id}},campaignID:8017,campaignRunID:8022,source:sms,source_details:broadcastID_4C2gkDV8oUAaewSMYeokEC",
        "attachments": [],
        "template": "rivescript"
      },
      "campaignId": null,
      "topic": "survey_response"
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

<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/broadcasts/2HdYviqiK46skcgKW6OSGk
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
