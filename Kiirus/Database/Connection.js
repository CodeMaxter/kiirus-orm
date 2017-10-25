'use strict'

const Arr = require('./../Support/Arr')
const Helper = require('./../Support/Helper')
const DateTime = require('./../Support/DateTime')
const Expression = require('./Query/Expression')
const Processor = require('./Query/Processors/Processor')
const QueryBuilder = require('./Query/Builder')
const QueryGrammar = require('./Query/Grammars/Grammar')
const SchemaBuilder = require('./Schema/Builder')

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
   * Run a delete statement against the database.
   *
   * @param  {string}  query
   * @param  {array}   bindings
   * @return {Promise<number>}
   */
  delete (query, bindings = []) {
    return this.affectingStatement(query, bindings)
  }

  /**
   * Disable the query log on the connection.
   *
   * @return {void}
   */
  disableQueryLog () {
    this._loggingQueries = false
  }

  /**
   * Enable the query log on the connection.
   *
   * @return {void}
   */
  enableQueryLog () {
    this._loggingQueries = true
  }

  /**
   * Clear the query log.
   *
   * @return {void}
   */
  flushQueryLog () {
    this._queryLog = []
  }

  /**
   * Get an option from the configuration options.
   *
   * @param  {string|undefined}  option
   * @return {*}
   */
  getConfig (option = undefined) {
    return Arr.get(this.config, option)
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
   * Get the name of the connected database.
   *
   * @return {string}
   */
  getDatabaseName () {
    return this._database
  }

  /**
   * Get the PDO driver name.
   *
   * @return {string}
   */
  getDriverName () {
    return this.getConfig('driver')
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
   * Get a schema builder instance for the connection.
   *
   * @return {\Kiirus\Database\Schema\Builder}
   */
  getSchemaBuilder () {
    if (this.schemaGrammar === undefined) {
      this.useDefaultSchemaGrammar()
    }

    return new SchemaBuilder(this)
  }

  /**
   * Get the schema grammar used by the connection.
   *
   * @return {\Kiirus\Database\Schema\Grammars\Grammar}
   */
  getSchemaGrammar () {
    return this._schemaGrammar
  }

  /**
   * Get the table prefix for the connection.
   *
   * @return {string}
   */
  getTablePrefix () {
    return this._tablePrefix
  }

  /**
   * Run an insert statement against the database.
   *
   * @param  {string}  query
   * @param  {array}   bindings
   * @return {Promise<boolean>}
   */
  insert (query, bindings = []) {
    return this.statement(query, bindings)
  }

  /**
   * Determine whether we're logging queries.
   *
   * @return {boolean}
   */
  logging () {
    return this._loggingQueries
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
   * Execute the given callback in "dry run" mode.
   *
   * @param  {function}  callback
   * @return {Promise<array>}
   */
  pretend (callback) {
    return this._withFreshQueryLog(() => {
      this.pretending = true

      // Basically to make the database connection "pretend", we will just return
      // the default values for all the query methods, then we will return an
      // array of queries that were "executed" within the Closure callback.
      callback(this)

      this.pretending = false

      return this._queryLog
    })
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
   * Get a new query builder instance.
   *
   * @return {\Kiirus\Database\Query\Builder}
   */
  query () {
    return new QueryBuilder(
      this, this.getQueryGrammar(), this.getPostProcessor()
    )
  }

  /**
   * Get a new raw query expression.
   *
   * @param  {*}  value
   * @return {\Kiirus\Database\Query\Expression}
   */
  raw (value) {
    return new Expression(value)
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
    // This method is overrided in the databases connection classes. This empty
    // method exists to pass the test while mocking this class.
  }

  /**
   * Run a select statement and return a single result.
   *
   * @param  {string}  query
   * @param  {array}   bindings
   * @param  {boolean} useReadPdo
   * @return {Promise<*>}
   */
  selectOne (query, bindings = []) {
    this.select(query, bindings).then((records) => {
      return records.shift()
    })
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
   * Set the name of the connected database.
   *
   * @param  {string}  database
   * @return {string}
   */
  setDatabaseName (database) {
    this._database = database
  }

  /**
   * Set the query post processor used by the connection.
   *
   * @param  {\Kiirus\Database\Query\Processors\Processor}  processor
   * @return {void}
   */
  setPostProcessor (processor) {
    this._postProcessor = processor
  }

  /**
   * Set the query grammar used by the connection.
   *
   * @param  {\Kiirus\Database\Query\Grammars\Grammar}  grammar
   * @return {void}
   */
  setQueryGrammar (grammar) {
    this._queryGrammar = grammar
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
   * Set the schema grammar used by the connection.
   *
   * @param  {\Kiirus\Database\Schema\Grammars\Grammar}  grammar
   * @return {void}
   */
  setSchemaGrammar (grammar) {
    this._schemaGrammar = grammar
  }

  /**
   * Set the table prefix in use by the connection.
   *
   * @param  {string}  prefix
   * @return {void}
   */
  setTablePrefix (prefix) {
    this._tablePrefix = prefix

    this.getQueryGrammar().setTablePrefix(prefix)
  }

  /**
   * Execute an SQL statement and return the boolean result.
   *
   * @param  {string}  query
   * @param  {array}   bindings
   * @return {Promise<boolean>}
   */
  statement () {
    // This method is overrided in the databases connection classes. This empty
    // method exists to pass the test while mocking this class.
  }

  /**
   * Begin a fluent query against a database table.
   *
   * @param  {string}  table
   * @return {\Kiirus\Database\Query\Builder}
   */
  table (table) {
    return this.query().from(table)
  }

  /**
   * Execute a Closure within a transaction.
   *
   * @param  {function}  callback
   * @param  {number}  attempts
   * @return {*}
   *
   * @throws {Exception|}
   */
  transaction (callback, attempts = 1) {
    return new Promise((resolve, reject) => {
      for (let currentAttempt = 1; currentAttempt <= attempts; currentAttempt++) {
        this._reconnectIfMissingConnection()

        this._connection.beginTransaction((error) => {
          if (error) {
            reject(error)
          }

          // We'll simply execute the given callback within a try / catch block and if we
          // catch any exception we can rollback this transaction so that none of this
          // gets actually persisted to a database or stored in a permanent fashion.
          try {
            const result = Helper.tap(callback(this), (result) => {
              this._connection.commit((error) => {
                if (error) {
                  return this._connection.rollback(() => {
                    reject(error)
                  })
                }
              })
            })

            resolve(result)
          } catch (e) {
            // If we catch an exception we'll rollback this transaction and try again if we
            // are not out of attempts. If we are out of attempts we will just throw the
            // exception back out and let the developer handle an uncaught exceptions.
            try {
              this._handleTransactionException(
                e, currentAttempt, attempts
              )
            } catch (e) {
              this._connection.rollBack(() => {
                reject(error)
              })
            }
          }
        })
      }
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
   * Determine if the given exception was caused by a deadlock.
   *
   * @param  {Exception}  e
   * @return {boolean}
   */
  _causedByDeadlock (e) {
    const message = e.getMessage()

    return [
      'Deadlock found when trying to get lock',
      'deadlock detected',
      'The database file is locked',
      'database is locked',
      'database table is locked',
      'A table in the database is locked',
      'has been chosen as the deadlock victim',
      'Lock wait timeout exceeded; try restarting transaction'
    ].includes(message)
  }

  /**
   * Determine if the given exception was caused by a lost connection.
   *
   * @param  {Exception}  e
   * @return {boolean}
   */
  _causedByLostConnection (e) {
    return [
      'server has gone away',
      'no connection to the server',
      'Lost connection',
      'is dead or not enabled',
      'Error while sending',
      'decryption failed or bad record mac',
      'server closed the connection unexpectedly',
      'SSL connection has been closed unexpectedly',
      'Deadlock found when trying to get lock',
      'Error writing data to the connection'
    ].includes(e.message)
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
   * Get the default query grammar instance.
   *
   * @return {\Kiirus\Database\Query\Grammars\Grammar}
   */
  _getDefaultQueryGrammar () {
    return new QueryGrammar()
  }

  /**
   * Get the default schema grammar instance.
   *
   * @return {\Kiirus\Database\Schema\Grammars\Grammar}
   */
  _getDefaultSchemaGrammar () {
      //
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
   * Handle an exception encountered when running a transacted statement.
   *
   * @param  {Exception}  e
   * @param  {number}  currentAttempt
   * @param  {number}  maxAttempts
   * @return {void}
   *
   * @throws {Exception}
   */
  _handleTransactionException (e, currentAttempt, maxAttempts) {
    // On a deadlock, MySQL rolls back the entire transaction so we can't just
    // retry the query. We have to throw this exception all the way out and
    // let the developer handle it in another way. We will decrement too.
    if (this._causedByDeadlock(e) && this.transactions > 1) {
      --this.transactions

      throw e
    }

    // If there was an exception we will rollback this transaction and then we
    // can check if we have exceeded the maximum attempt count for this and
    // if we haven't we will return and try this query again in our loop.
    this.rollBack()

    if (this._causedByDeadlock(e) && currentAttempt < maxAttempts) {
      return
    }

    throw e
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

  /**
   * Handle a query exception that occurred during query execution.
   *
   * @param  {\Kiirus\Database\QueryException}  e
   * @param  {string}    query
   * @param  {array}     bindings
   * @param  {function}  callback
   * @return {*}
   *
   * @throws {\Kiirus\Database\QueryException}
   */
  _tryAgainIfCausedByLostConnection (e, query, bindings, callback) {
    if (this._causedByLostConnection(e.getPrevious())) {
      this.reconnect()

      return this._runQueryCallback(query, bindings, callback)
    }

    throw e
  }

  /**
   * Execute the given callback in "dry run" mode.
   *
   * @param  {function}  callback
   * @return {array}
   */
  _withFreshQueryLog (callback) {
    const loggingQueries = this._loggingQueries

    // First we will back up the value of the logging queries property and then
    // we'll be ready to run callbacks. This query log will also get cleared
    // so we will have a new log of all the queries that are executed now.
    this.enableQueryLog()

    this._queryLog = []

    // Now we'll execute this callback and capture the result. Once it has been
    // executed we will restore the value of query logging and give back the
    // value of hte callback so the original callers can have the results.
    const result = callback()

    this._loggingQueries = loggingQueries

    return result
  }
}
