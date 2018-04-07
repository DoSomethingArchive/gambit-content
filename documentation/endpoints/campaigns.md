# Campaigns

## Retrieve all Campaigns

```
GET /v1/campaigns
```

Returns a list of Campaigns that have Gambit keywords available.

<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/campaigns?exclude=true \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
```

</p></details>

<details><summary>**Example Response**</summary><p>

```
  "data": [
    {
      "id": 2710,
      "title": "#SuperStressFace",
      "status": "active",
      "keywords": [
        "STRESSBOT"
      ]
    },
    {
      "id": 1524,
      "title": "Bubble Breaks",
      "status": "active",
      "keywords": [
        "BUBBLEBOT"
      ]
    },
    {
      "id": 6620,
      "title": "Dunk You Very Much",
      "status": "active",
      "keywords": [
        "DUNKBOT",
        "DUNKINTIME"
      ]
    },
  ]
```

</p></details>

## Retrieve a Campaign

```
GET /v1/campaigns/:id
```

Returns a single Campaign, and its rendered templates for Gambit usage.

A Campaign's `templates` properties are rendered from the fields values defined on a Campaign's corresponding Contentful Campaign. Each `templates` property is an object with properties:

* `override` -- boolean specifying whether the `raw` value is defined on the entry for the
given Campaign ID, or the default Campaign
* `raw` -- string, the copy stored in Contentful to use for this message type
* `rendered` -- string, the rendered copy to be delivered to the end user

<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/campaigns/7483 \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
```

</p></details>
<details><summary>**Example Response**</summary><p>

```
{
  "data": {
    "id": 2900,
    "title": "Get Lucky",
    "tagline": "Stash our fortune tellers with tips on using condoms.",
    "status": "active",
    "currentCampaignRun": {
      "id": 6477
    },
    "keywords": [
      "LUCKYBOT"
    ],
    "botConfig": {
      "postType": "text",
      "templates": {
        "gambitSignupMenu": {
          "raw": "Thanks for signing up for {{title}}! Text {{cmd_reportback}} to submit a post.",
          "override": false,
          "rendered": "Thanks for signing up for Get Lucky! Text START to submit a post."
        },
        "externalSignupMenu": {
          "raw": "Hi its Freddie from DoSomething! Thanks for signing up for {{title}}! Text {{cmd_reportback}} to submit a post.",
          "override": false,
          "rendered": "Hi its Freddie from DoSomething! Thanks for signing up for Get Lucky! Text START to submit a post."
        },
      }
    }
  }
}
```

</p></details>
