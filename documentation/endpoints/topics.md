# Topics

A conversation topic may be set to one of the following Contentful content types:

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

## Retrieve topics

```
GET /v1/topics
```

Returns topics.

### Query parameters

Name | Type | Description
-----|------|------------
`limit` | Number | Number of results to retrieve
`skip` | Number | Number of results to skip


<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/topics?skip=5
  -H "Accept: application/json"
  -H "Content-Type: application/json"
```

</p></details>

<details><summary>**Example Response**</summary><p>

```
{
  "data": [
    {
      "id": "2Wzzquygx2wwMWe8kQAMgc",
      "name": "Two Books Blue Books autoReply",
      "type": "autoReply",
      "createdAt": "2018-08-10T00:36:19.926Z",
      "updatedAt": "2018-08-13T14:16:42.499Z",
      "campaign": {
        "id": 2299,
        "title": "Two Books Blue Books",
        "tagline": "Host a Dr. Seuss book drive to benefit kids in family shelters.",
        "status": "active",
        "currentCampaignRun": {
          "id": 6441
        }
      },
      "templates": {
        "autoReply": {
          "text": "Who let the dogs out?",
          "topic": {}
        }
      },
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
            "updatedAt": "2018-08-07T15:44:59.609Z"
          }
        },
        "saidNo": {
          "text": "Ok, we'll check in with you later.",
          "topic": {}
        },
        "invalidAskYesNoResponse": {
          "text": "Sorry, I didn't get that - did you want to join for Pump It Up? Yes or No",
          "topic": {}
        },
        "autoReply": {
          "text": "Sorry, I didn't understand that. Text Q if you have a question.",
          "topic": {}
        }
      },
    },
    {
      "id": "3peS2Oye08o6OwUMAEcS2c",
      "type": "photoPostConfig",
      "postType": "photo",
      "campaign": {
        "id": 8038,
        "title": "#SaveTheMascots",
        "tagline": "Help us make every college campus tobacco-free.",
        "status": "closed",
        "currentCampaignRun": {
          "id": 8039
        },
        "keywords": [
          "MASCOT"
        ]
      },
      "templates": {
        "startPhotoPost": {
          "raw": "Secondhand smoke causes cancer, which is why thousands of colleges have gone tobacco-free. Problem is, 3,273 campuses still allow tobacco, which means secondhand smoke is harming everyone on campus including our beloved mascots. \n\nTell your college (or a college near you) to pledge to go tobacco-free by telling them to #SaveTheMascots by clicking here: http://bit.ly/2GE8APl\n\nTake a screenshot of the post you share, then text {{cmd_reportback}} to share it with us (and enter for a chance to win a $2500 scholarship)!",
          "override": true,
          "rendered": "Secondhand smoke causes cancer, which is why thousands of colleges have gone tobacco-free. Problem is, 3,273 campuses still allow tobacco, which means secondhand smoke is harming everyone on campus including our beloved mascots. \n\nTell your college (or a college near you) to pledge to go tobacco-free by telling them to #SaveTheMascots by clicking here: http://bit.ly/2GE8APl\n\nTake a screenshot of the post you share, then text START to share it with us (and enter for a chance to win a $2500 scholarship)!"
        },
        ...
      },
    },
    ...
  ],
  "meta": {
    "pagination": {
      "total": 21,
      "skip": 5,
      "limit": 100
    }
  }
}
```

</p></details>

## Retrieve topic

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
      "keywords": [
        "MIRROR"
      ]
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
    "triggers": [
      "mirror",
    ]
  }
}
```

</p></details>
