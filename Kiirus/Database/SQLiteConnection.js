'use strict'

const Connection = require('./Connection')
const SQLiteBuilder = require('./Schema/SQLiteBuilder')
const SQLiteProcessor = require('./Query/Processors/SQLiteProcessor')
const QueryGrammar = require('./Query/Grammars/SQLiteGrammar')
const SchemaGrammar = require('./Schema/Grammars/SQLiteGrammar')

module.exports = class SQLiteConnection extends Connection {
  /**
   * Get the default query grammar instance.
   *
   * @return {\Kiirus\Database\Query\Grammars\SQLiteGrammar}
   */
  _getDefaultQueryGrammar () {
    return this.withTablePrefix(new QueryGrammar())
  }

  /**
   * Get a schema builder instance for the connection.
   *
   * @return {\Kiirus\Database\Schema\SQLiteBuilder}
   */
  getSchemaBuilder () {
    if (this._schemaGrammar === undefined) {
      this.useDefaultSchemaGrammar()
    }

    return new SQLiteBuilder(this)
  }

  /**
   * Get the default schema grammar instance.
   *
   * @return {\Kiirus\Database\Schema\Grammars\SQLiteGrammar}
   */
  _getDefaultSchemaGrammar () {
    return this.withTablePrefix(new SchemaGrammar())
  }

  /**
   * Get the default post processor instance.
   *
   * @return {\Kiirus\Database\Query\Processors\SQLiteProcessor}
   */
  _getDefaultPostProcessor () {
    return new SQLiteProcessor()
  }
}
