# API

Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`GET /v1/broadcasts` | Retrieve broadcasts
`GET /v1/broadcasts/:id` | Retrieve a single broadcast
`GET /v1/campaigns` | [Retrieve all campaigns with active topics](endpoints/campaigns.md#retrieve-all-campaigns)
`GET /v1/campaigns/:id` | [Retrieve a campaign](endpoints/campaigns.md#retrieve-a-campaigns)
`GET /v1/defaultTopicTriggers` | [Retrieve all additional default topic triggers](endpoints/defaultTopicTriggers.md)
`GET /v1/topics` | [Retrieve topics](endpoints/topics.md#retrieve-all-topics)
`GET /v1/topics/:id` | [Retrieve a topic](endpoints/topics.md#retrieve-a-topic)
`POST /v1/campaignActivity` | [Parses an inbound message from user as campaign activity](endpoints/campaignActivity.md)
