# API

Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`GET /v1/campaigns` | [Retrieve all Campaigns with keywords available in Gambit](endpoints/campaigns.md#retrieve-all-campaigns)
`GET /v1/campaigns/:id` | [Retrieve a single Campaign](endpoints/campaigns.md#retrieve-a-campaigns)
`POST /v1/receive-message` | [Receive a Campaign Signup Message](endpoints/receive-message.md)


## To be deprecated

Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`POST /v1/campaigns/:id/messages` | [Sends a Campaign template message via Mobile Commons](endpoints/campaigns.md#send-a-campaign-message) -- To be deprecated by Conversations `POST /send-message`
`POST /v1/chatbot` | [Receives Mobile Commons mData request and sends reply via Mobile Commons](endpoints/chatbot.md) -- To be deprecated by Conversations `POST /receive-message`
`POST /v1/signups` | [Sends externalSignupMenu template via Mobile Commons to Signup User for Signup Campaign](endpoints/signups.md) -- To be deprecated by Conversations `POST /send-message`
