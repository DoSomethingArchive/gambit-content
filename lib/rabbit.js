'use strict';

const stathat = app.locals.stathat;
const logger = app.locals.logger;

const amqp = require('amqplib');
const AMQP_RETRY_FREQUENCY = 2000;

function onError(err) {
  logger.error('Rabbit Error', err);
  stathat(`gambit-core rabbit error ${err.code || '(no error code specified)'}`);
}

class Connection {
  constructor() {
    this.channel = {};

    this.connect = this.connect.bind(this);
  }

  connect() {
    amqp.connect(process.env.RABBIT_URI)
    .then(connection => connection.createChannel())
    .then((channel) => {
      this.channel = channel;
    })
    .catch((err) => {
      onError(err);
      setTimeout(this.connect, AMQP_RETRY_FREQUENCY);
    });
  }
}

const rabbitConnection = new Connection();
rabbitConnection.connect();

module.exports = {
  produce(queueName, message) {
    const outgoing = JSON.stringify(message);

    return rabbitConnection.channel
    .assertQueue(queueName)
    .then(() => rabbitConnection.channel.sendToQueue(queueName, new Buffer(outgoing)))
    .catch(onError);
  },
};
