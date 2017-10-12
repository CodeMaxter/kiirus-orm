'use strict'

const Connection = require('./Connection')
const SQLiteBuilder = require('./Schema/SQLiteBuilder')
const SqlServerProcessor = require('./Query/Processors/SqlServerProcessor')
const QueryGrammar = require('./Query/Grammars/SqlServerGrammar')
const SchemaGrammar = require('./Schema/Grammars/SqlServerGrammar')

module.exports = class SqlServerConnection extends Connection {
  /**
   * Execute a Closure within a transaction.
   *
   * @param  {function}  callback
   * @param  {number}    attempts
   * @return {*}
   *
   * @throws {\Error}
   */
  transaction (callback, attempts = 1) {
    for (a = 1; a <= attempts; ++a) {
      if (this.getDriverName() === 'sqlsrv') {
        return super.transaction(callback)
      }

      this.getPdo().exec('BEGIN TRAN')

      // We'll simply execute the given callback within a try / catch block
      // and if we catch any exception we can rollback the transaction
      // so that none of the changes are persisted to the database.
      try {
        result = callback(this)

        this.getPdo().exec('COMMIT TRAN')
      }

      // If we catch an exception, we will roll back so nothing gets messed
      // up in the database. Then we'll re-throw the exception so it can
      // be handled how the developer sees fit for their applications.
      catch (Exception e) {
        this.getPdo().exec('ROLLBACK TRAN')

        throw e
      }

      return result
    }
  }
  /**
   * Get the default query grammar instance.
   *
   * @return {\Kiirus\Database\Query\Grammars\SqlServerGrammar}
   */
  _getDefaultQueryGrammar () {
    return this.withTablePrefix(new QueryGrammar())
  }

  /**
   * Get a schema builder instance for the connection.
   *
   * @return {\Kiirus\Database\Schema\SqlServerBuilder}
   */
  getSchemaBuilder () {
    if (is_null(this._schemaGrammar)) {
      this.useDefaultSchemaGrammar()
    }

    return new SqlServerBuilder(this)
  }

  /**
   * Get the default schema grammar instance.
   *
   * @return {\Kiirus\Database\Schema\Grammars\SqlServerGrammar}
   */
  _getDefaultSchemaGrammar () {
    return this.withTablePrefix(new SchemaGrammar())
  }

  /**
   * Get the default post processor instance.
   *
   * @return {\Kiirus\Database\Query\Processors\SqlServerProcessor}
   */
  _getDefaultPostProcessor () {
    return new SqlServerProcessor()
  }
}
