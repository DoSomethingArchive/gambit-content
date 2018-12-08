# Campaigns

The `campaigns` resource queries the Rogue API for a campaign, and our Contentful space for chatbot configurations.


Fields:

Name | Type | Description
-----|------|------------
`id` | Number | The campaign id
`title` | String | The internal campaign title
`status` | String | Either `'active'` or `'closed'`. Users may not participate in chatbot topics for closed campaigns.
`endDate` | Date | Used to determine `status` - if endDate is set and passed, status is `closed`
`config` | Object | The chatbot configuration for this campaign
`config.id` | String | The id of the chatbot configuration
`config.templates` | Object | Message templates defined for the campaign
`config.templates.webSignup` | Object | Message template to user if they signed up for this campaign on the web


```
GET /v1/campaigns/:id
```

Returns a campaign and its config if set.

### Query parameters

Name | Type | Description
-----|------|------------
`cache` | string | If set to `false`, fetches campaign from Rogue and campaignConfig from Contentful and resets each cache.

<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/campaigns/7
  -H "x-gambit-api-key: totallysecret"
  -H "Accept: application/json"
  -H "Content-Type: application/json"
```

</p></details>
<details><summary>**Example Response**</summary><p>

```
{
  "data": {
    "id": 7,
    "title": "Mirror Messages",
    "status": "active",
    "endDate": null,
    "config": {
      "id": "68Oy1FcaR2EiaMieicaoom",
      "templates": {
        "webSignup": {
          "text": "Hi this is Freddie from DoSomething! Thanks for signing up for mirror messages. When youve posted some notes and ready to send a photo, text START",
          "attachments": [],
          "template": "webSignup",
          "topic": {
            "id": "6W1kHJ1XYASOK8w8Q42eum",
            "name": "Mirror Messages - Post a note",
            "type": "photoPostConfig",
            "createdAt": "2018-06-27T17:13:46.755Z",
            "updatedAt": "2018-08-08T14:45:12.186Z",
            "postType": "text",
            "campaign": {...},
            "templates": {...}
          }
        }
      }
    },
  }
}
```

</p></details>
