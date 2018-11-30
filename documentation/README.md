# API

All endpoints require either a valid `x-gambit-api-key` header or `apiKey` query parameter.


Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`GET /v1/broadcasts` | [Retrieve broadcasts](endpoints/broadcasts.md#retrieve-broadcasts)
`GET /v1/broadcasts/:id` | [Retrieve a broadcast](endpoints/broadcasts.md#retrieve-broadcast)
`GET /v1/campaigns` | [Retrieve all campaigns with active topics](endpoints/campaigns.md#retrieve-all-campaigns)
`GET /v1/campaigns/:id` | [Retrieve a campaign](endpoints/campaigns.md#retrieve-campaign)
`GET /v1/contentfulEntries/` | [Retrieve Contentful entries](endpoints/contentfulEntries.md#retrieve-contentful-entries)
`GET /v1/contentfulEntries/:id` | [Retrieve a Contentful entry](endpoints/contentfulEntries.md#retrieve-contentful-entry)
`GET /v1/defaultTopicTriggers` | [Retrieve all additional default topic triggers](endpoints/defaultTopicTriggers.md)
`GET /v1/topics` | [Retrieve topics](endpoints/topics.md#retrieve-topics)
`GET /v1/topics/:id` | [Retrieve a topic](endpoints/topics.md#retrieve-topic)
