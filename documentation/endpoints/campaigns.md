# Campaigns

## Retrieve Campaigns running on Gambit

```
GET /v1/campaigns
```

Returns index of Campaigns with published keywords.


**Parameters**

Name | Type | Description
--- | --- | ---
`exclude` | `string` | If `true`, exclude querying for Mobile Commons Groups (To be deprecated post-TGM).

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
    "id": 7483,
    "title": "Rinse, Recycle, Repeat",
    "tagline": "Make a recycling bin to make it easier to recycle empty beauty products.",
    "status": "active",
    "currentCampaignRun": {
      "id": 7549
    },
    "reportbackInfo": {
      "confirmationMessage": "Thanks for helping to keep #empties out of landfills! You'll receive an email shortly with a free shipping label so you can send your empties to TerraCycle to be upcycled.",
      "noun": "bins",
      "verb": "decorated"
    },
    "facts": {
      "problem": "Nearly half of Americans don’t regularly recycle their beauty and personal care products. That’s a major reason these items account for a significant amount of landfill waste."
    },
    "templates": {
      "gambitSignupMenu": {
        "override": true,
        "raw": "Great - it's simple: Keep beauty and personal care products out of landfills by making fun and creative recycling bins for the bathroom! \n\nThis action should take between 10 - 20 mins. Make it colorful so friends and family won't forget to recycle their bathroom empties. \n\nWhen you're done, text {{cmd_reportback}} to share a photo of your bin and you'll be entered to win a $5000 scholarship!",
        "rendered": "Great - it's simple: Keep beauty and personal care products out of landfills by making fun and creative recycling bins for the bathroom! \n\nThis action should take between 10 - 20 mins. Make it colorful so friends and family won't forget to recycle their bathroom empties. \n\nWhen you're done, text START to share a photo of your bin and you'll be entered to win a $5000 scholarship!"
      },
      "externalSignupMenu": {
        "override": true,
        "raw": "Thanks for joining {{title}}!\n\nNearly half of Americans don’t regularly recycle their beauty and personal care products. That’s a major reason these items account for a significant amount of landfill waste.\n\nThe solution is simple: Make fun and creative bins for bathrooms.\n\nOnce you have created some bathroom recycling bins, take a pic to prove it! Then text {{cmd_reportback}} to share it with us!",
        "rendered": "Thanks for joining Rinse Recycle Repeat!\n\nNearly half of Americans don’t regularly recycle their beauty and personal care products. That’s a major reason these items account for a significant amount of landfill waste.\n\nThe solution is simple: Make fun and creative bins for bathrooms.\n\nOnce you have created some bathroom recycling bins, take a pic to prove it! Then text START to share it with us!"
      },
      ...
    },
    "keywords": [
      {
        "keyword": "RINSEBOT"
      }
    ],
    "contentfulUri": "https://app.contentful.com/spaces/pupp3tSl0Th/entries/3tUIp8oqTemqaSOKqGwIe6"
  }
}
```

</p></details>

## Send a campaign message

```
POST /v1/campaigns/:id/message
```

Returns either an `error` or `success` object.

**Parameters**

Name | Type | Description
--- | --- | ---
`phone` | `string` | **Required.** Mobile number to send the campaign message.
`type`  | `string` | <div>**Required.** The campaign message type.</div><div>Supported types are: `scheduled_relative_to_signup_date`, `scheduled_relative_to_reportback_date`</div>

<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/campaigns/2900/message \
     -H "x-gambit-api-key: totallysecret" \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     -d '{"phone": "5555555511", "type": "scheduled_relative_to_signup_date"}'
```

</p></details>

<details><summary>**Example Response**</summary><p>

```
{
  "success": {
    "code": 200,
    "message": "@dev: Have you completed Get Lucky yet?  \n\nIf you have created some fortune tellers, take a pic to prove it and text back LUCKYBOT"
  }
}
```

</p></details>
