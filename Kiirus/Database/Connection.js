'use strict'

const Collection = require('./../Database/Ceres/Collection')
const DateTime = require('./../Support/DateTime')
const Processor = require('./Query/Processors/Processor')
const QueryGrammar = require('./Query/Grammars/Grammar')

module.exports = class Connection {
  /**
   * Create a new database connection instance.
   *
   * @param  {object}   connection
   * @param  {string}   database
   * @param  {string}   tablePrefix
   * @param  {array}    config
   * @return {void}
   */
  constructor (connection, database = '', tablePrefix = '', config = []) {
    // First we will setup the default properties. We keep track of the DB
    // name we are connected to since it is needed when some reflective
    // type commands are run such as checking whether a table exists.

    /**
     * The database connection configuration options.
     *
     * @var {array}
     */
    this._config = config

    /**
     * The active connection.
     *
     * @var {object}
     */
    this._connection = connection

    /**
     * The name of the connected database.
     *
     * @var {string}
     */
    this._database = database

    /**
     * Indicates whether queries are being logged.
     *
     * @var {boolean}
     */
    this._loggingQueries = false

    /**
     * The query post processor implementation.
     *
     * @var {\Kiirus\Database\Query\Processors\Processor}
     */
    this._postProcessor = null

    /**
     * Indicates if the connection is in a "dry run".
     *
     * @var {boolean}
     */
    this._pretending = false

    /**
     * The query grammar implementation.
     *
     * @var {\Kiirus\Database\Query\Grammars\Grammar}
     */
    this._queryGrammar = undefined

    /**
     * All of the queries run against the connection.
     *
     * @var {array}
     */
    this._queryLog = []

    /**
     * The reconnector instance for the connection.
     *
     * @var {function}
     */
    this._reconnector = null

    /**
     * Indicates if changes have been made to the database.
     *
     * @var {number}
     */
    this._recordsModified = false

    /**
     * The table prefix for the connection.
     *
     * @var {string}
     */
    this._tablePrefix = tablePrefix

    /**
     * The number of active transactions.
     *
     * @var {number}
     */
    this._transactions = 0

    // We need to initialize a query grammar and the query post processors
    // which are both very important parts of the database abstractions
    // so we initialize these to their default values while starting.
    this.useDefaultQueryGrammar()

    this.useDefaultPostProcessor()
  }

  /**
   * Get the default query grammar instance.
   *
   * @return {\Kiirus\Database\Query\Grammars\Grammar}
   */
  _getDefaultQueryGrammar () {
    return new QueryGrammar()
  }

  /**
   * Get the default post processor instance.
   *
   * @return {\Kiirus\Database\Query\Processors\Processor}
   */
  _getDefaultPostProcessor () {
    return new Processor()
  }

  /**
   * Reconnect to the database if a PDO connection is missing.
   *
   * @return {void}
   */
  _reconnectIfMissingConnection () {
    if (this.getConnection() === undefined) {
      this.reconnect()
    }
  }

  /**
   * Run a SQL statement and log its execution context.
   *
   * @param  {string}    query
   * @param  {array}     bindings
   * @param  {string}     type
   * @return {Promise}
   *
   * @throws {\Kiirus\Database\QueryException}
   */
  _run (query, bindings, callback) {
    let result

    this._reconnectIfMissingConnection()

    const start = Math.floor(Date.now() / 1000)

    // Here we will run this query. If an exception occurs we'll determine if it was
    // caused by a connection that has been lost. If that is the cause, we'll try
    // to re-establish connection and re-run the query with a fresh connection.
    try {
      // result = this._runQueryPromise(query, bindings).then((result) => {
      result = this._runQueryCallback(query, bindings, callback)
    } catch (e) {
      result = this._handleQueryException(
        e, query, bindings
      )
    }

    // Once we have run the query we will calculate the time that it took to run and
    // then log the query, bindings, and execution time so we will report them on
    // the event that the developer needs them. We'll log time in milliseconds.
    this.logQuery(
      query, bindings, this._getElapsedTime(start)
    )

    return result
  }

  /**
   * Run a SQL query or prepare statement.
   *
   * @param  {string}    query
   * @param  {array}     bindings
   * @return {Promise<\Kiirus\Database\Ceres\Collection>}
   *
   * @throws {\Kiirus\Database\QueryException}
   */
  _runQueryCallback (query, bindings, callback) {
    // To execute the statement, we'll simply call the callback, which will actually
    // run the SQL against the PDO connection. Then we can calculate the time it
    // took to execute and log the query SQL, bindings and time in our memory.
    try {
      return callback(query, bindings)
    } catch (e) {
      // If an exception occurs when attempting to run a query, we'll format the error
      // message to include the bindings with SQL, which will make this exception a
      // lot more helpful to the developer instead of just the database's errors.
      throw new Error(query, this.prepareBindings(bindings), e)
    }
  }

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
   * Get the current Database connection.
   *
   * @return {\Connection}
   */
  getConnection () {
    return this._connection
  }

  /**
   * Get the query grammar used by the connection.
   *
   * @return {\Kiirus\Database\Query\Grammars\Grammar}
   */
  getQueryGrammar () {
    return this._queryGrammar
  }

  /**
   * Run an insert statement against the database.
   *
   * @param  {string}  query
   * @param  {array}   bindings
   * @return {boolean}
   */
  insert (query, bindings = []) {
    return this.statement(query, bindings)
  }

  /**
   * Log a query in the connection's query log.
   *
   * @param  {string}  query
   * @param  {array}   bindings
   * @param  {number|undefined}  time
   * @return {void}
   */
  logQuery (query, bindings, time = null) {
    // TODO: implement this code
    // this.event(new QueryExecuted(query, bindings, time, this));

    if (this._loggingQueries) {
      this._queryLog.push({
        query,
        bindings,
        time
      })
    }
  }

  /**
   * Prepare the query bindings for execution.
   *
   * @param  {array}  bindings
   * @return {array}
   */
  prepareBindings (bindings) {
    const grammar = this.getQueryGrammar()

    for (const [key, value] of bindings.entries()) {
      // We need to transform all instances of DateTimeInterface into the actual
      // date string. Each query grammar maintains its own date string format
      // so we'll just ask the grammar for the format to get from the date.
      if (value instanceof Date) {
        bindings[key] = new DateTime(value).format(grammar.getDateFormat())
      } else if (value === false) {
        bindings[key] = 0
      }
    }

    return bindings
  }

  /**
   * Determine if the connection in a "dry run".
   *
   * @return {boolean}
   */
  pretending () {
    return this._pretending === true
  }

  /**
   * Indicate if any records have been modified.
   *
   * @param  {boolean}  value
   * @return {void}
   */
  recordsHaveBeenModified (value = true) {
    if (!this._recordsModified) {
      this._recordsModified = value
    }
  }

  /**
   * Run a select statement against the database.
   *
   * @param  {string}  query
   * @param  {array}  bindings
   * @return {Promise}
   */
  select (query, bindings = []) {
    return this._run(query, bindings)
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
          let results = []

          this.disconnect()

          if (error) {
            reject(error)
          }

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
   * Run an update statement against the database.
   *
   * @param  {string}  query
   * @param  {array}   bindings
   * @return {Promise<number>}
   */
  update (query, bindings = []) {
    return this.affectingStatement(query, bindings)
  }

  /**
   * Set the query grammar to the default implementation.
   *
   * @return {void}
   */
  useDefaultQueryGrammar () {
    this._queryGrammar = this._getDefaultQueryGrammar()
  }

  /**
   * Set the query post processor to the default implementation.
   *
   * @return {void}
   */
  useDefaultPostProcessor () {
    this._postProcessor = this._getDefaultPostProcessor()
  }
}
