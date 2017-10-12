'use strict'

const Connection = require('./Connection')
const PostgresBuilder = require('./Schema/PostgresBuilder')
const PostgresProcessor = require('./Query/Processors/PostgresProcessor')
const QueryGrammar = require('./Query/Grammars/PostgresGrammar')
const SchemaGrammar = require('./Schema/Grammars/PostgresGrammar')

module.exports = class PostgresConnection extends Connection {
  /**
   * Get a schema builder instance for the connection.
   *
   * @return {\Kiirus\Database\Schema\PostgresBuilder}
   */
  getSchemaBuilder () {
    if (this.schemaGrammar === undefined) {
      this.useDefaultSchemaGrammar()
    }

    return new PostgresBuilder(this)
  }

  /**
   * Get the default post processor instance.
   *
   * @return {\Kiirus\Database\Query\Processors\PostgresProcessor}
   */
  _getDefaultPostProcessor () {
    return new PostgresProcessor()
  }

  /**
   * Get the default query grammar instance.
   *
   * @return {\Kiirus\Database\Query\Grammars\PostgresGrammar}
   */
  _getDefaultQueryGrammar () {
    return this.withTablePrefix(new QueryGrammar())
  }

  /**
   * Get the default schema grammar instance.
   *
   * @return {\Kiirus\Database\Schema\Grammars\PostgresGrammar}
   */
  _getDefaultSchemaGrammar () {
    return this.withTablePrefix(new SchemaGrammar())
  }
}
