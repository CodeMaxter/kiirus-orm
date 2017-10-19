'use strict'

const Connection = require('./Connection')
const SqlServerBuilder = require('./Schema/SqlServerBuilder')
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
    for (let currentAttempt = 1; currentAttempt <= attempts; ++currentAttempt) {
      if (this.getDriverName() === 'sqlsrv') {
        return super.transaction(callback)
      }

      return new Promise((resolve, reject) => {
        // We'll simply execute the given callback within a try / catch block
        // and if we catch any exception we can rollback the transaction
        // so that none of the changes are persisted to the database.
        let result

        try {
          result = callback(this)

          this._connection.commit((error) => {
            if (error) {
              return this._connection.rollback(() => {
                reject(error)
              })
            }

            resolve(result)
          })
        } catch (e) {
          // If we catch an exception, we will roll back so nothing gets messed
          // up in the database. Then we'll re-throw the exception so it can
          // be handled how the developer sees fit for their applications.
          return this._connection.rollback(() => {
            reject(e)
          })
        }
      })
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
    if (this._schemaGrammar === undefined) {
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
