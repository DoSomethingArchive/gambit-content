# Gambit
Gambit is the internal DoSomething.org API used to send/receive messages to and from Mobile Commons, enabling DoSomething Members to complete Campaigns over SMS. Gambit is built using [Express](http://expressjs.com/) and [MongoDB](https://www.mongodb.com).

### Getting Started

Install Node, MongoDB, and the Heroku toolbelt.

Next, fork and clone this repository. To run Gambit locally:
* `sudo mongod`
* `npm install`
* `npm run test` Make sure all tests pass
* `heroku local` from your Gambit directory

#### Docker

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
