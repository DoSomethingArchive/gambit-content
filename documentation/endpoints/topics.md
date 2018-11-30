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
    "id": "5SjLFshPcAyO26qCYyCei4",
    "name": "Escape the Vape - campaign autoReply",
    "type": "autoReply",
    "createdAt": "2018-10-24T02:07:11.606Z",
    "updatedAt": "2018-11-01T17:06:26.833Z",
    "campaign": {
      "id": 8190,
      "title": "Escape the Vape",
      "tagline": "Take this 5-question quiz to learn what's really in e-cigs.",
      "status": "active",
      "currentCampaignRun": {
        "id": 8191
      },
      "endDate": "2018-12-16T03:59:00Z"
    },
    "templates": {
      "autoReply": {
        "text": "Sorry I didn't get that. Text Q if you have a question.\n\nBy taking and sharing this 5 question quiz, you can educate your friends AND be automatically entered for a chance to win a $5,000 scholarship!\nhttps://www.dosomething.org/us/campaigns/escape-vape/quiz/vape-quiz?user_id={{user.id}}",
        "topic": {
          
        }
      }
    }
  }
}
```

</p></details>
