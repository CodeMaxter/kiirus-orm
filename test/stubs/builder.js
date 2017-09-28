'use strict'

const Builder = require('./../../Kiirus/Database/Query/Builder')
const Connection = require('./../../Kiirus/Database/Connection')
const Grammar = require('./../../Kiirus/Database/Query/Grammars/Grammar')
const MySqlGrammar = require('./../../Kiirus/Database/Query/Grammars/MySqlGrammar')
const PostgresGrammar = require('./../../Kiirus/Database/Query/Grammars/PostgresGrammar')
const Processor = require('./../../Kiirus/Database/Query/Processors/Processor')
const SQLiteGrammar = require('./../../Kiirus/Database/Query/Grammars/SQLiteGrammar')
const SqlServerGrammar = require('./../../Kiirus/Database/Query/Grammars/SqlServerGrammar')

const config = require('./../../examples/config/database')

const getBuilder = () => {
  const connection = new Connection(config)
  const grammar = new Grammar()
  const processor = new Processor()
  const builder = new Builder(connection, grammar, processor)

  return builder
}

const getMySqlBuilder = () => {
  const connection = new Connection()
  const grammar = new MySqlGrammar()
  const processor = new Processor()
  const builder = new Builder(connection, grammar, processor)

  return builder
}

const getPostgresBuilder = () => {
  const connection = new Connection()
  const grammar = new PostgresGrammar()
  const processor = new Processor()
  const builder = new Builder(connection, grammar, processor)

  return builder
}

const getSQLiteBuilder = () => {
  const connection = new Connection()
  const grammar = new SQLiteGrammar()
  const processor = new Processor()
  const builder = new Builder(connection, grammar, processor)

  return builder
}

const getSqlServerBuilder = () => {
  const connection = new Connection()
  const grammar = new SqlServerGrammar()
  const processor = new Processor()
  const builder = new Builder(connection, grammar, processor)

  return builder
}

module.exports = {
  getBuilder: getBuilder,
  getMySqlBuilder: getMySqlBuilder,
  getPostgresBuilder: getPostgresBuilder,
  getSQLiteBuilder: getSQLiteBuilder,
  getSqlServerBuilder: getSqlServerBuilder
}
