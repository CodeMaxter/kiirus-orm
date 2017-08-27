'use strict'

const Builder = require('./../../Kiirus/Database/Query/Builder')
const Connection = require('./../../Kiirus/Database/Connection')
const Grammar = require('./../../Kiirus/Database/Query/Grammars/Grammar')
const Processor = require('./../../Kiirus/Database/Query/Processors/Processor')

const getBuilder = () => {
  const connection = new Connection()
  const grammar = new Grammar()
  const processor = new Processor()
  const builder = new Builder(connection, grammar, processor)

  return builder
}

module.exports = {
  getBuilder: getBuilder
}
