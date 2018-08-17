# Campaigns

The `campaigns` resource queries the Phoenix API for campaigns, and our Contentful space for chatbot
configurations.


Fields:

Name | Type | Description
-----|------|------------
`id` | Number | The campaign id
`title` | String | The campaign title, available as a `{{title}}` tag within a topic template
`tagline` | String | The campaign tagline, available as a `{{tagline}}` tag within a topic template
`status` | String | Either `'active'` or `'closed'`. Users may not participate in chatbot topics for closed campaigns.
`currentCampaignRun` | Object | Contains a numeric `id` property to be passed when creating a post for the campaign
`config` | Object | The chatbot configuration for this campaign
`config.id` | String | The id of the chatbot configuration
`config.templates` | Object | Message templates defined for the campaign
`config.templates.webSignup` | Object | Message template to user if they signed up for this campaign on the web
`topics` | Array | To be deprecated -- List of active [topics](/topics.md) available for the campaign.


## Retrieve all campaigns

```
GET /v1/campaigns
```

Returns a list of campaigns that active topics.

<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/campaigns \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
```

</p></details>

<details><summary>**Example Response**</summary><p>

```
{
  "data": [
    {
      "id": 7,
      "title": "Mirror Messages",
      "tagline": "Boost a stranger's self-esteem with just a sticky note!",
      "status": "active",
      "currentCampaignRun": {
        "id": 8076
      },
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
      "topics": [
        {
          "id": "6swLaA7HKE8AGI6iQuWk4y",
          "name": "Mirror Messages",
          "postType": "photo",
          "triggers": [
            "mirror"
          ]
        }
      ]
    },
    {
      "id": 2178,
      "title": "Give a Spit About Cancer",
      "tagline": "Fight blood cancer just by swabbing your cheek.",
      "status": "closed",
      "currentCampaignRun": {
        "id": 8044
      },
      "topics": [
        {
          "id": "tv7e98JGXmMM2kskGaUA2",
          "name": "Give A Spit - Share link",
          "postType": "external",
          "triggers": [
            "spit"
          ]
        }
      ]
    },
  ]
}
```

</p></details>

## Retrieve campaign

```
GET /v1/campaigns/:id
```

Returns a campaign and its config if set.

### Query parameters

Name | Type | Description
-----|------|------------
`cache` | string | If set to `false`, fetches campaign from Phoenix and campaignConfig from Contentful and resets each cache.

<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/campaigns/7 \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
```

</p></details>
<details><summary>**Example Response**</summary><p>

```
{
  "data": {
    "id": 7,
    "title": "Mirror Messages",
    "tagline": "Boost a stranger's self-esteem with just a sticky note!",
    "status": "active",
    "currentCampaignRun": {
      "id": 8076
    },
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
    "topics": [...],
  }
}
```

</p></details>
