'use strict'

const Collection = require('./../Database/Ceres/Collection')
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
  _run (query, bindings) {
    let result

    this._reconnectIfMissingConnection()

    const start = Math.floor(Date.now() / 1000)

    // Here we will run this query. If an exception occurs we'll determine if it was
    // caused by a connection that has been lost. If that is the cause, we'll try
    // to re-establish connection and re-run the query with a fresh connection.
    try {
      result = this._runQueryPromise(query, bindings)
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
  _runQueryPromise (query, bindings) {
    // To execute the statement, we'll simply call the callback, which will actually
    // run the SQL against the PDO connection. Then we can calculate the time it
    // took to execute and log the query SQL, bindings and time in our memory.
    try {
      return new Promise((resolve, reject) => {
        if (this.pretending()) {
          resolve(new Collection([]))
        }

        this._connection.query(query, bindings, (error, rows) => {
          let results = []

          this.disconnect()

          if (error) {
            reject(error)
          }

          if (rows !== undefined) {
            results = new Collection(rows)
          }

          try {
            resolve(results)
          } catch (ex) {
            reject(ex)
          }
        })
      })
    } catch (e) {
      // If an exception occurs when attempting to run a query, we'll format the error
      // message to include the bindings with SQL, which will make this exception a
      // lot more helpful to the developer instead of just the database's errors.
      throw new Error(query, this.prepareBindings(bindings), e)
    }
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
   * Determine if the connection in a "dry run".
   *
   * @return {boolean}
   */
  pretending () {
    return this._pretending === true
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
   * @return {boolean}
   */
  statement (query, bindings = []) {
    return this._run(query, bindings)

    // return this._run(query, bindings, (query, bindings) => {
    //   if (this.pretending()) {
    //     return true
    //   }

    //   this.bindValues(statement, this.prepareBindings(bindings))

    //   this.recordsHaveBeenModified()

    //   return statement.execute()
    // })
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
