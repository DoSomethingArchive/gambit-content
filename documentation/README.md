# API

Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`GET /v1/campaigns` | [Retrieve all campaign with keywords available in Gambit](endpoints/campaigns.md#retrieve-all-campaigns) -- to be deprecated by `GET /topics`
`GET /v1/campaigns/:id` | [Retrieve a single campaign](endpoints/campaigns.md#retrieve-a-campaigns)
`POST /v1/campaignActivity` | [Parses an inbound message from user as campaign activity](endpoints/campaignActivity.md)
`GET /v1/defaultTopicTriggers` | [Retrieve all Rivescript triggers to be added to the chatbot default topic](endpoints/defaultTopicTriggers.md)
`GET /v1/topics` | [Retrieve all chatbot topics](endpoints/topics.md#retrieve-all-topics)
`GET /v1/topics/:id` | [Retrieve data for a single chatbot topic](endpoints/topics.md#retrieve-a-topic)
