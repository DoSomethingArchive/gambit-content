# API

Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`GET /v1/campaigns` | [Retrieve all Campaigns with keywords available in Gambit](endpoints/campaigns.md#retrieve-all-campaigns)
`GET /v1/campaigns/:id` | [Retrieve a single Campaign](endpoints/campaigns.md#retrieve-a-campaigns)
`POST /v1/campaignActivity` | [Receive a Campaign Activity from Gambit Conversations](endpoints/campaignActivity.md)
`POST /v1/receive-message` | To be deprecated by `POST /v1/campaignActivity` (identical route)
