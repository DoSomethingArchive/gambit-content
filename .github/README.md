[![wercker status](https://app.wercker.com/status/3e08a89169eeafef8ec020a9ceafe204/s/master "wercker status")](https://app.wercker.com/project/byKey/3e08a89169eeafef8ec020a9ceafe204) [![codecov](https://codecov.io/gh/DoSomething/gambit-campaigns/branch/master/graph/badge.svg)](https://codecov.io/gh/DoSomething/gambit-campaigns)

# Gambit Content

Gambit Content fetches data from [Phoenix](https://github.com/DoSomething/phoenix) and Contentful to provide a Content API for use by [Gambit Conversations](https://github.com/dosomething/gambit-conversations).

## API 

All endpoints require either a valid `x-gambit-api-key` header or `apiKey` query parameter.

Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`GET /v1/broadcasts` | [Retrieve broadcasts](endpoints/broadcasts.md#retrieve-broadcasts)
`GET /v1/broadcasts/:id` | [Retrieve a broadcast](endpoints/broadcasts.md#retrieve-broadcast)
`GET /v1/campaigns/:id` | [Retrieve a campaign](endpoints/campaigns.md#retrieve-campaign)
`GET /v1/contentfulEntries/` | [Retrieve Contentful entries](endpoints/contentfulEntries.md#retrieve-contentful-entries)
`GET /v1/contentfulEntries/:id` | [Retrieve a Contentful entry](endpoints/contentfulEntries.md#retrieve-contentful-entry)
`GET /v1/defaultTopicTriggers` | [Retrieve all additional default topic triggers](endpoints/defaultTopicTriggers.md)
`GET /v1/topics` | [Retrieve topics](endpoints/topics.md#retrieve-topics)
`GET /v1/topics/:id` | [Retrieve a topic](endpoints/topics.md#retrieve-topic)

## Development

Gambit Content is built using [Express](http://expressjs.com/) and [Redis](https://redis.io/).


### Installation

* Install Node and Redis
* Clone this repo, and create a `.env` file with required variables. See `.env.example`.
* Redis should be running.
  * Run `redis-cli ping`. You should get `PONG` as a response.
  * If error, make sure you have installed redis using `brew` and started the service.
* `npm install`
* `npm start`

### Contributing

* Contributions to this repo must adhere to the steps in wunder.io's Git workflow:  **[Wunderflow](http://wunderflow.wunder.io/)**.

* Run `npm all-tests` to lint code and run automated tests.


### License
&copy;2018 DoSomething.org. Gambit Content is free software, and may be redistributed under the terms specified
in the [LICENSE](https://github.com/DoSomething/gambit-campaigns/blob/dev/LICENSE) file. The name and logo for
DoSomething.org are trademarks of Do Something, Inc and may not be used without permission.
