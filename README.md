ds-mdata-responder [![wercker status](https://app.wercker.com/status/9d555c2fca4693f2916ca44aa97da126/s "wercker status")](https://app.wercker.com/project/bykey/9d555c2fca4693f2916ca44aa97da126) [![Coverage Status](https://img.shields.io/coveralls/DoSomething/ds-mdata-responder.svg)](https://coveralls.io/r/DoSomething/ds-mdata-responder)
==================

The `ds-mdata-responder` powers all of DoSomething.org's SMS games as well as a large number of our text-message-driven campaigns. It interacts with the MobileCommons platform to send messages, handling MData requests and sending responses while computing game logic or quite simply, what message should be sent to which user when. 

## Prerequisites
1. [Node](http://nodejs.org/download/)
2. [Mongo](http://docs.mongodb.org/manual/installation/)

## Local Development
1. Fork this repo
2. Clone locally `git clone git@github.com:USERNAME/ds-mdata-responder.git`
3. For continued setup instructions, check out the [setup page](https://github.com/DoSomething/ds-mdata-responder/wiki/Setup) in the responder's wiki. 

## Testing
1. `npm test`

## Roadmap