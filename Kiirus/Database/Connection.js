'use strict'

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
    this._postProcessor = undefined

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
    this._reconnector = undefined

    /**
     * Indicates if changes have been made to the database.
     *
     * @var {number}
     */
    this._recordsModified = false

    /**
     * The schema grammar implementation.
     *
     * @var {\Kiirus\Database\Schema\Grammars\Grammar}
     */
    this._schemaGrammar = undefined

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
   * Get the current Database connection.
   *
   * @return {\Connection}
   */
  getConnection () {
    return this._connection
  }

  /**
   * Get the query post processor used by the connection.
   *
   * @return {\Kiirs\Database\Query\Processors\Processor}
   */
  getPostProcessor () {
    return this._postProcessor
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
   * Reconnect to the database.
   *
   * @return {void}
   *
   * @throws {\LogicException}
   */
  reconnect () {
    if (typeof this._reconnector === 'function') {
      return this._reconnector(this)
    }

    throw new Error('LogicException: Lost connection and no reconnector available.')
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
    // This method is overrided in the databases connection classes
  }

  /**
   * Set database connection.
   *
   * @param  {object|undefined}  connection
   * @return {this}
   */
  setConnection (connection) {
    this._transactions = 0

    this._connection = connection

    return this
  }

  /**
   * Set the reconnect instance on the connection.
   *
   * @param  {function}  reconnector
   * @return {Kiirus\Database\Connection}
   */
  setReconnector (reconnector) {
    this._reconnector = reconnector

    return this
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

  /**
   * Set the schema grammar to the default implementation.
   *
   * @return {void}
   */
  useDefaultSchemaGrammar () {
    this._schemaGrammar = this._getDefaultSchemaGrammar()
  }

  /**
   * Set the table prefix and return the grammar.
   *
   * @param  {\Kiirus\Database\Grammar}  grammar
   * @return {\Kiirus\Database\Grammar}
   */
  withTablePrefix (grammar) {
    grammar.setTablePrefix(this._tablePrefix)

    return grammar
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
   * Get the elapsed time since a given starting point.
   *
   * @param  {number}    start
   * @return {number}
   */
  _getElapsedTime (start) {
    const end = Math.floor(Date.now() / 1000)

    return Math.round((end - start), 2)
  }

  /**
   * Handle a query exception.
   *
   * @param  {\Exception}  e
   * @param  {string}  query
   * @param  {array}  bindings
   * @param  \Closure  callback
   * @return {*}
   * @throws {\Exception}
   */
  _handleQueryException (e, query, bindings) {
    if (this._transactions >= 1) {
      throw e
    }

    return this._tryAgainIfCausedByLostConnection(
      e, query, bindings
    )
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
}
