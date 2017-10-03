'use strict'

const Builder = require('./Database/Query/Builder')
const Expression = require('./Database/Query/Expression')
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
  Expression
}
