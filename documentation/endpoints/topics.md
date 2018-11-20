# Topics

A conversation topic may be set to a hardcoded Rivescript topic, or one of the following Contentful content types:

* `askSubscriptionStatus` - asks user their SMS broadcast preferences (and can be sent as a [broadcast](./broadcasts.md))

* `askVotingPlanStatus` - asks user their voting plan status, and asks for voting plan info if they plan to vote (and can be sent as a [broadcast](./broadcasts.md))

* `askYesNo` - asks yes/no question (and can be sent as a [broadcast](./broadcasts.md))

* `autoReply` - repeats a single `autoReply` template, creates a signup if campaign is set

* `photoPostConfig` - creates a signup and sends replies to create a photo post for a campaign

* `textPostConfig` - creates a signup and sends replies to create text post for a campaign

Legacy types:

* `externalPostConfig` - creates a signup for a campaign, `autoReply` is to be used instead


Fields:

Name | Type | Description
-----|------|------------
`id` | String | The Contentful entry id
`type` | String | The Contentful entry type, e.g. `photoPostConfig`, `textPostConfig`
`postType` | String | The type of post the topic should create, e.g. `photo`
`campaign` | Object | The campaign this topic should create a signup and post for.
`templates` | Object | Collection of outbound message templates that can be sent from this topic.
`templates.raw` | String | The field value stored in Contentful to return for the template, or a hardcoded default value if the field value is not set
`templates.text` | String | The `raw` value replaced with any campaign or command tags. See https://github.com/DoSomething/gambit-admin/wiki/Tags
`templates.override` | Boolean | Whether the `raw` value is set from a Contentful field value (override is `true`), or from a hardcoded default (override is `false`)
`templates.topic` | Object | If an id is present, this reply template should update the conversation topic accordingly.

```
GET /v1/topics/:id
```

Returns a topic.

### Query parameters

Name | Type | Description
-----|------|------------
`cache` | string | If set to `false`, fetches topic from Contentful and resets cache.


<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/topics/6swLaA7HKE8AGI6iQuWk4y?cache=false \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
```

</p></details>
<details><summary>**Example Response**</summary><p>

```
{
  "data": {
    "id": "6swLaA7HKE8AGI6iQuWk4y",
    "type": "photoPostConfig",
    "postType": "photo",
    "campaign": {
      "id": 7,
      "title": "Mirror Messages",
      "tagline": "Boost a stranger's self-esteem with just a sticky note!",
      "status": "active",
      "currentCampaignRun": {
        "id": 8076
      },
    },
    "templates": {
      "startPhotoPost": {
        "raw": "Over 111,000 people have joined the movement to bring positivity to their schools. All it takes is posting encouraging notes in places that can trigger low self-esteem. Take 5 mins to post a note today. \n\nThen, text {{cmd_reportback}} to share a photo of the messages you posted (and you'll be entered to win a $2000 scholarship)!",
        "override": true,
        "rendered": "Over 111,000 people have joined the movement to bring positivity to their schools. All it takes is posting encouraging notes in places that can trigger low self-esteem. Take 5 mins to post a note today. \n\nThen, text START to share a photo of the messages you posted (and you'll be entered to win a $2000 scholarship)!"
      },
      ...
      "invalidAskContinueResponse": {
        "raw": "Sorry, I didn't get that. Did you want to join {{title}}?\n\nYes or No",
        "override": false,
        "rendered": "Sorry, I didn't get that. Did you want to join Mirror Messages?\n\nYes or No"
      }
    },
  }
}
```

</p></details>
