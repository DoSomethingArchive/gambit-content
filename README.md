[![wercker status](https://app.wercker.com/status/3e08a89169eeafef8ec020a9ceafe204/s/master "wercker status")](https://app.wercker.com/project/byKey/3e08a89169eeafef8ec020a9ceafe204) [![codecov](https://codecov.io/gh/DoSomething/gambit/branch/develop/graph/badge.svg)](https://codecov.io/gh/DoSomething/gambit)

# Gambit
Gambit is the internal DoSomething.org API used to send/receive messages to and from Mobile Commons, enabling DoSomething Members to complete Campaigns over SMS. Gambit is built using [Express](http://expressjs.com/) and [MongoDB](https://www.mongodb.com).

### Getting Started

Install Node, MongoDB, redis, and the Heroku toolbelt.

Next, fork and clone this repository. To run Gambit locally:
* Mongo should be runing.
  * Run `mongo`.
  * If error, Run `sudo mongod`.
* Redis should be running.
  * Run `redis-cli ping`. You should get `PONG` as a response.
  * If error, make sure you have installed redis using `brew` and started the service.
* `npm install`
* `npm run all-tests` Make sure all tests pass
* `heroku local` from your Gambit directory

#### Docker (deprecated)

Gambit can also be installed via Docker:

1. `git clone`
2. `docker-compose up`

All apps are executed by `Foreman` to handle process management & mimic Heroku.
`Nodemon` will autoreload the server when a file changes.
The compose file defines env variables for connection details & network mapping.

### License
&copy;2017 DoSomething.org. Gambit is free software, and may be redistributed under the terms specified
in the [LICENSE](https://github.com/DoSomething/gambit/blob/dev/LICENSE) file. The name and logo for
DoSomething.org are trademarks of Do Something, Inc and may not be used without permission.
