# Default topic triggers

The defaultTopicTrigger entries define additional Rivescript [triggers to add to the default topic](https://www.rivescript.com/docs/tutorial#triggers) that is [hardcoded](https://github.com/DoSomething/gambit-conversations/tree/master/brain).

Fields:

Name | Type | Description
-----|------|------------
`id` | String | The Contentful entry id
`trigger` | String | The line of text used to match an inbound message from a user
`reply` | String | If set, the line of text to be returned as a reply to the user
`redirect` | String | If set, references the `trigger` that contains the `reply` to be used for this trigger
`topicId` | String | If set, updates the conversation topic. To be deprecated once gambit-conversations queries for the `topic` property
`topic` | Object | If set, updates the conversation topic.

A default topic trigger will have either a single `reply`, `redirect`, or `topicId` set, it cannot have a combination of these properties.


```
GET /v1/defaultTopicTriggers
```

Returns defaultTopicTrigger entries.

Note: This endpoint currently returns a cached list of defaultTopicTrigger entries if exists. We will no longer need to cache the list once the Conversations API uses Redis to cache parsed Rivescript.
@see https://github.com/DoSomething/gambit-conversations/pull/398

### Query parameters

Name | Type | Description
-----|------|------------
`cache` | string | If set to `false`, fetches default topic triggers from Contentful instead of checking cache.


<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/defaultTopicTriggers
  -H "Accept: application/json"
  -H "Content-Type: application/json"
```

</p></details>

<details><summary>**Example Response**</summary><p>

```
{
  "data": [
    {
      "id": "4epEVvqGfeIEmMG4aqEEU",
      "trigger": "chat",
      "reply": "Sorry, can't chat now! I'm responding to text messages that get young people to take action in their community. For all information, go to <bot url>!"
    },
    {
      "id": "4dKgY5hMuACg2qK0sueysG",
      "trigger": "(what|how) you (doing|doin|feeling|feelin|up to) [*]",
      "redirect": "chat"
    },
    {
      "id": "4bK32GTCNius2EMie8OIko",
      "trigger": "brake",
      "topicId": "5PhrBp29VuiEuiwCqOSCEW",
      "topic": {
        "id": "5PhrBp29VuiEuiwCqOSCEW",
        "name": "Brake It Down - Take quiz",
        "type": "externalPostConfig",
        "postType": "external",
        "campaign": {
          "id": 8109,
          "title": "Brake It Down",
          "tagline": "Take a quiz to increase road safety.",
          "status": "active",
          "currentCampaignRun": {
            "id": 8110
          },
          "keywords": [
            "BRAKE"
          ]
        },
        "templates": {
          ...
        }
      }
    },
    {
      "id": "OBeo4BHGWiuaGiKA82A20",
      "trigger": "(smosh|smash|smsh|smoosh|shmsh)",
      "reply": "Ian & Anthony are super busy doing other funny and cool things. It's <bot name> for now! Don't forget, everything you need is at <bot url>. Text ya later!"
    },
    {
      "id": "2eQcVISjvWKCCGOmqOycMW",
      "trigger": "scam",
      "reply": "I'm <bot name>, the *real* person at <bot url> who sends out all of our texts! We're a global non-profit org that helps <bot member_count> people take social action :) \\n\n\n^ You probably signed up for updates from <bot url>, were referred by a friend, or a previous owner of this number signed up!"
    },
    {
      "id": "2OSVbOpFGEyGOYqqcgsyqM",
      "trigger": "join",
      "reply": "Boom! You signed up for <bot url>. My name's <bot name> - I'll send you weekly texts on campaigns you can get involved in. Text MENU for an action you can take right now, Text STOP to quit "
    },
    {
      "id": "247dsdYBKo02AwE4kqyk4m",
      "trigger": "what time is it [*]",
      "redirect": "chat"
    },
    {
      "id": "1olM0J7sMEsaiOwUgaSE0w",
      "trigger": "i [have] never heard of you",
      "redirect": "scam"
    },
    {
      "id": "5iubQXtjG88MgKSM4sOWmi",
      "trigger": "history",
      "reply": "Hi, I'm <bot name> from <bot url>! Did you catch our mural on the Atlanta Beltline? This mural celebrates actress, activist and professor, Adrienne McNeil Herndon. She was one of the first African American faculty at the University of Atlanta and a key supporter of black suffrage.\\n\n\n^ We created this mural to remember forgotten histories and to raise the voices of young people. Want to learn how you can amplify YOUR voice and unleash YOUR power? Text VOICE now! "
    },
    {
      "id": "75VF4bdgCkg4E2M20CiIMG",
      "trigger": "ford",
      "redirect": "join"
    },
    {
      "id": "2pqshI52mwC8OG4WOUC8EK",
      "trigger": "you are real",
      "redirect": "scam"
    },
    {
      "id": "2kpCVLk2naAmwm2MSKY0ik",
      "trigger": "(r|are|is this) [you] a @bot [*]",
      "redirect": "bot"
    },
    {
      "id": "3eyZbe15POQK0UY0Ew4Eg0",
      "trigger": "[*] you are a @bot [*]",
      "redirect": "bot"
    },
    {
      "id": "3JAkFfRoVySaee8UcuuQaU",
      "trigger": "[*] shawn [*]",
      "reply": "Thanks so much ! I hope you get really involved. Check out <bot url> for actions you can take ! Gotta go now !"
    },
    {
      "id": "tfTRRWf55I8YskcwOQSY0",
      "trigger": "[is] this [is] a scam",
      "redirect": "scam"
    },
    {
      "id": "24u0xlNfCAWM8GOQUSUqYs",
      "trigger": "(what|how) [are|did] you [*]",
      "redirect": "chat"
    },
    {
      "id": "64jOfDO1wWceyeaCYm8yyw",
      "trigger": "what is your age [*]",
      "reply": "Age is just a number!"
    },
    {
      "id": "6gXh0WgQXCMqs2AeeIGASe",
      "trigger": " i do not know you",
      "redirect": "scam"
    }
  ]
}
```

</p></details>


