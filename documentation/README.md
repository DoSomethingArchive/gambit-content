# API


## Chatbot

Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`POST /v1/chatbot` | [Chat](endpoints/chatbot.md#chat)


## Campaigns

Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`GET /v1/campaigns` | [Retrieve all campaigns](endpoints/campaigns.md#retrieve-all-campaigns)
`GET /v1/campaigns/:id` | [Retrieve a campaign](endpoints/campaigns.md#retrieve-a-campaigns)


## Signups

Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`POST /v1/signups` | [Post existing signup](endpoints/signups.md)


## Legacy

> :memo: We're looking to deprecate these, so don't get too attached!

Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`POST /ds-routing/campaign-transition` | [Mobile Commons campaign transition](https://github.com/DoSomething/gambit/wiki/API#moco-campaign-transition)
`POST /ds-routing/yes-no-gateway` | [Submit yes or no](https://github.com/DoSomething/gambit/wiki/API#yes-no)
`POST /reportback/:campaignName` | [Reportback chat](https://github.com/DoSomething/gambit/wiki/API#reportback)
