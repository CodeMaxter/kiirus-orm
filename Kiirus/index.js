'use strict'

const Builder = require('./Database/Query/Builder')
const ConnectionFactory = require('./Database/Connectors/ConnectionFactory')

module.exports = {
  createBuilder: (config) => {
    const connectionFactory = new ConnectionFactory()
    const connection = connectionFactory.make(config)

    return new Builder(
      connection,
      connection.getQueryGrammar(),
      connection.getPostProcessor()
    )
  },
  ConnectionFactory: require('./Database/Connectors/ConnectionFactory')
}
