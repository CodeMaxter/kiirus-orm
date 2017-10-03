'use strict'

const Collection = require('./../Database/Ceres/Collection')
const Connection = require('./Connection')
const MySqlBuilder = require('./Schema/MySqlBuilder')
const MySqlProcessor = require('./Query/Processors/MySqlProcessor')
const QueryGrammar = require('./Query/Grammars/MySqlGrammar')
const SchemaGrammar = require('./Schema/Grammars/MySqlGrammar')

module.exports = class MySqlConnection extends Connection {
  /**
   * Run an SQL statement and get the number of rows affected.
   *
   * @param  {string}  query
   * @param  {array}   bindings
   * @return {number}
   */
  affectingStatement (query, bindings = []) {
    return this._run(query, bindings, (query, bindings) => {
      if (this.pretending()) {
        return Promise.resolve(0)
      }

      // For update or delete statements, we want to get the number of rows affected
      // by the statement and return that back to the developer. We'll first need
      // to execute the statement and then we'll use PDO to fetch the affected.
      return new Promise((resolve, reject) => {
        this._connection.query(query, bindings, (error, result) => {
          this.disconnect()

          if (error) {
            reject(error)
          }

          const count = result.affectedRows

          this.recordsHaveBeenModified(count > 0)

          resolve(count)
        })
      })
    })
  }

  /**
   * Disconnect from the underlying Database connection.
   *
   * @return {void}
   * @memberOf MySqlConnection
   */
  disconnect () {
    if (this._connection === undefined) {
      return
    }

    this._connection.end((error) => {
      if (error) {
        throw Error(error)
      }

      this.setConnection(undefined)
    })
  }

  /**
   * Get a schema builder instance for the connection.
   *
   * @return {\Kiirus\Database\Schema\MySqlBuilder}
   */
  getSchemaBuilder () {
    if (this._schemaGrammar === undefined) {
      this.useDefaultSchemaGrammar()
    }

    return new MySqlBuilder(this)
  }

  /**
   * Run a select statement against the database.
   *
   * @param  {string}  query
   * @param  {array}  bindings
   * @return {Promise}
   */
  select (query, bindings = []) {
    return this._run(query, bindings, (query, bindings) => {
      if (this.pretending()) {
        return []
      }

      // For select statements, we'll simply execute the query and return an array
      // of the database result set. Each element in the array will be a single
      // row from the database table, and will either be an array or objects.
      return new Promise((resolve, reject) => {
        this._connection.query(query, bindings, (error, rows, fields) => {
          this.disconnect()

          if (error) {
            reject(error)
          }

          const results = new Collection(rows || [])

          resolve(results)
        })
      })
    })
  }

  /**
   * Execute an SQL statement and return the boolean result.
   *
   * @param  {string}  query
   * @param  {array}   bindings
   * @return {Promise<boolean>}
   */
  statement (query, bindings = []) {
    return this._run(query, bindings, (query, bindings) => {
      if (this.pretending()) {
        return Promise.resolve(true)
      }

      return new Promise((resolve, reject) => {
        this._connection.query(query, bindings, (error, rows) => {
          this.disconnect()

          if (error) {
            reject(error)
          }

          let results = []
          if (rows !== undefined) {
            results = new Collection(rows)
          }

          this.recordsHaveBeenModified()

          resolve(results)
        })
      })
    })
  }

  /**
   * Get the default post processor instance.
   *
   * @return {\Kiirus\Database\Query\Processors\MySqlProcessor}
   */
  _getDefaultPostProcessor () {
    return new MySqlProcessor()
  }

  /**
   * Get the default query grammar instance.
   *
   * @return {\Kiirus\Database\Query\Grammars\MySqlGrammar}
   */
  _getDefaultQueryGrammar () {
    return this.withTablePrefix(new QueryGrammar())
  }

  /**
   * Get the default schema grammar instance.
   *
   * @return {\Kiirus\Database\Schema\Grammars\MySqlGrammar}
   */
  _getDefaultSchemaGrammar () {
    return this.withTablePrefix(new SchemaGrammar())
  }
}
