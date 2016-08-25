# Gambit

This is __Gambit__, a DoSomething.org chatbot API for use with Mobile Commons.


## Endpoints

#### Chatbot
Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`POST /v1/chatbot` | [Chat](endpoints/chatbot.md)
`POST /v1/chatbot/sync` | [Sync chatbot content](endpoints/chatbot.md#sync)



#### DS Campaigns

> :memo: We're looking to deprecate these, so don't get too attached!

Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`POST /ds-routing/campaign-transition` | [Mobile Commons campaign transition](endpoints/ds-routing.md#campaign-transition)
`POST /ds-routing/yes-no-gateway` | [Submit yes or no](endpoints/ds-routing.md#yes-no-gateway)
`POST /reportback/:campaignName` | [Reportback chat](endpoints/reportback.md)
