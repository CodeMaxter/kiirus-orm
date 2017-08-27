'use strict'

const Arr = require('./../../Support/Arr')
const Collection = require('./../../Support/Collection')
const Expression = require('./Expression')
const Helper = require('./../../Support/Helper')
const JoinClause = require('./JoinClause')

module.exports = class Builder {
  /**
   * Create a new query builder instance.
   *
   * @param  {\Core\Database\Connection}  connection
   * @param  {\Core\Database\Query\Grammars\Grammar}  grammar
   * @param  {\Core\Database\Query\Processors\Processor}  processor
   * @return {void}
   */
  constructor (connection, grammar, processor) {
    /**
     * An aggregate function and column to be run.
     *
     * @var {object}
     */
    this.aggregateProperty = undefined

    /**
     * The current query value bindings.
     *
     * @var {array}
     */
    this.bindings = {
      'select': [],
      'join': [],
      'where': [],
      'having': [],
      'order': [],
      'union': []
    }

    /**
     * The columns that should be returned.
     *
     * @var {array}
     */
    this.columns = undefined

    /**
     * The database connection instance.
     *
     * @var {\Kiirus\Database\Connection}
     */
    this.connection = connection

    /**
     * Indicates if the query returns distinct results.
     *
     * @var {boolean}
     */
    this.distinctProperty = false

    /**
     * The database query grammar instance.
     *
     * @var {\Kiirus\Database\Query\Grammars\Grammar}
     */
    this.grammar = grammar

    /**
     * The table joins for the query.
     *
     * @var {array}
     */
    this.joins = []

    /**
     * All of the available clause operators.
     *
     * @var {array}
     */
    this.operators = [
      '=', '<', '>', '<=', '>=', '<>', '!=',
      'like', 'like binary', 'not like', 'between', 'ilike',
      '&', '|', '^', '<<', '>>',
      'rlike', 'regexp', 'not regexp',
      '~', '~*', '!~', '!~*', 'similar to',
      'not similar to', 'not ilike', '~~*', '!~~*'
    ]

    /**
     * The database query post processor instance.
     *
     * @var {\Kiirus\Database\Query\Processors\Processor}
     */
    this.processor = processor

    /**
     * The table which the query is targeting.
     *
     * @var {string}
     */
    this.table = undefined

    /**
     * The where constraints for the query.
     *
     * @var {array}
     */
    this.wheres = []
  }

  /**
   * Add an array of where clauses to the query.
   *
   * @param  {array}  column
   * @param  {string}  boolean
   * @param  {string}  method
   * @return {this}
   */
  _addArrayOfWheres (column, boolean, method = 'where') {
    return this.whereNested((query) => {
      for (let key in column) {
        const value = column[key]

        if (Helper.isNumeric(key) && Array.isArray(value)) {
          query[method](...value)
        } else {
          query[method](key, '=', value, boolean)
        }
      }
    }, boolean)
  }

  /**
   * Determine if the given operator is supported.
   *
   * @param  {string}  operator
   * @return {boolean}
   */
  _invalidOperator (operator) {
    return !this.operators.includes(operator.toLowerCase()) &&
      !this.grammar.getOperators().includes(operator.toLowerCase())
  }

  /**
   * Determine if the given operator and value combination is legal.
   *
   * Prevents using Null values with invalid operators.
   *
   * @param  {string}  operator
   * @param  {*}  value
   * @return {boolean}
   */
  _invalidOperatorAndValue (operator, value) {
    return value === null && this.operators.includes(operator) &&
      !['=', '<>', '!='].includes(operator)
  }

  /**
   * Prepare the value and operator for a where clause.
   *
   * @param  {string}  value
   * @param  {string}  operator
   * @param  {boolean}  useDefault
   * @return {array}
   *
   * @throws {\InvalidArgumentException}
   */
  _prepareValueAndOperator (value, operator, useDefault = false) {
    if (useDefault) {
      return [operator, '=']
    } else if (this._invalidOperatorAndValue(operator, value)) {
      throw new Error('Illegal operator and value combination.')
    }

    return [value, operator]
  }

  _runSelect () {
    return this.connection.select(
      this.toSql(),
      this.getBindings()
    )
  }

  /**
   * Add a full sub-select to the query.
   *
   * @param  string   column
   * @param  string   operator
   * @param  \Closure callback
   * @param  string   boolean
   * @return this
   */
  _whereSub (column, operator, callback, boolean) {
    const type = 'Sub'

    const query = this.newQuery()

    // Once we have the query instance we can simply execute it so it can add all
    // of the sub-select's conditions to itself, and then we can cache it off
    // in the array of where clauses for the "main" parent query instance.
    callback(query)

    this.wheres.push({
      type, column, operator, query, boolean
    })

    this.addBinding(query.getBindings(), 'where')

    return this
  }

  /**
   * Add a binding to the query.
   *
   * @param  {*}   value
   * @param  {string}  type
   * @return {Builder}
   *
   * @throws {\InvalidArgumentException}
   */
  addBinding (value, type = 'where') {
    if (!Helper.keyExists(type, this.bindings)) {
      throw new Error(`Invalid binding type: ${type}.`)
    }

    if (Array.isArray(value)) {
      this.bindings[type] = Object.values(Helper.merge(this.bindings[type], value))
    } else {
      this.bindings[type].push(value)
    }

    return this
  }

  /**
   * Add another query builder as a nested where to the query builder.
   *
   * @param  {\Kiirus\Database\Query\Builder|static} query
   * @param  {string}  boolean
   * @return {this}
   */
  addNestedWhereQuery (query, boolean = 'and') {
    if (query.wheres.length > 0) {
      const type = 'Nested'

      this.wheres.push({type, query, boolean})

      this.addBinding(query.getBindings(), 'where')
    }

    return this
  }

  /**
   * Add a new select column to the query.
   *
   * @param  {array|*}  column
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  addSelect (column) {
    column = Array.isArray(column) ? column : Array.from(arguments)

    this.columns = Helper.merge(this.columns, column)

    return this
  }

  /**
   * Force the query to only return distinct results.
   *
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  distinct () {
    this.distinctProperty = true

    return this
  }

  /**
   * Create a new query instance for nested where condition.
   *
   * @return {\Kiirus\Database\Query\Builder}
   */
  forNestedWhere () {
    return this.newQuery().from(this.table)
  }

  /**
   * Set the table which the query is targeting.
   *
   * @param  {string}  table
   * @return {\Kiirus\Database\Query\Builder}
   */
  from (table) {
    this.table = table

    return this
  }

  /**
   * Execute the query as a "select" statement.
   *
   * @param  {array}  columns
   * @return {Promise</Kiirus/Database/Ceres/Collection>}
   */
  get (columns = ['*']) {
    const original = this.columns

    if (original === null) {
      this.columns = columns
    }

    const results = this.processor.processSelect(this, this._runSelect())

    this.columns = original

    return results
  }

  /**
   * Get the current query value bindings in a flattened array.
   *
   * @return {array}
   */
  getBindings () {
    return Arr.flatten(this.bindings)
  }

  /**
   * Get the database connection instance.
   *
   * @return {\Kiirus\Database\ConnectionInterface}
   */
  getConnection () {
    return this.connection
  }

  /**
   * Get the query grammar instance.
   *
   * @return {\Kiirus\Database\Query\Grammars\Grammar}
   */
  getGrammar () {
    return this.grammar
  }

  /**
   * Get the database query processor instance.
   *
   * @return {\Kiirus\Database\Query\Processors\Processor}
   */
  getProcessor () {
    return this.processor
  }

  /**
   * Add a join clause to the query.
   *
   * @param  {string}  table
   * @param  {string}  first
   * @param  {string}  operator
   * @param  {string}  second
   * @param  {string}  type
   * @param  {boolean}    where
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  join (table, first, operator = null, second = null, type = 'inner', where = false) {
    const join = new JoinClause(this, type, table)

    // If the first "column" of the join is really a Closure instance the developer
    // is trying to build a join with a complex "on" clause containing more than
    // one condition, so we'll add the join and call a Closure with the query.
    if (typeof first === 'function') {
      first(join)

      this.joins.push(join)

      this.addBinding(join.getBindings(), 'join')
    } else {
      // If the column is simply a string, we can assume the join simply has a basic
      // "on" clause with a single condition. So we will just build the join with
      // this simple join clauses attached to it. There is not a join callback.
      const method = where ? 'where' : 'on'

      this.joins.push(join[method](first, operator, second))

      this.addBinding(join.getBindings(), 'join')
    }

    return this
  }

  /**
   * Get a new instance of the query builder.
   *
   * @return {\Illuminate\Database\Query\Builder}
   */
  newQuery () {
    return new this.constructor(this.connection, this.grammar, this.processor)
  }

  /**
   * Set the columns to be selected.
   *
   * @param  {array|*}  columns
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  select (columns = ['*']) {
    this.columns = Array.isArray(columns) ? columns : Array.from(arguments)

    return this
  }

  /**
   * Pass the query to a given callback.
   *
   * @param  {function}  callback
   * @return {\Kiirus\Database\Query\Builder}
   */
  tap (callback) {
    return this.when(true, callback)
  }

  /**
   * Get the SQL representation of the query.
   *
   * @return {string}
   */
  toSql () {
    return this.grammar.compileSelect(this)
  }

  /**
   * Apply the callback's query changes if the given "value" is false.
   *
   * @param  {*}  value
   * @param  {function}  callback
   * @param  {function}  default
   * @return {*}
   */
  unless (value, callback, defaultValue = null) {
    if (!value) {
      const result = callback(this, value)

      return result || this
    } else if (defaultValue) {
      const result = defaultValue(this, value)

      return result || this
    }

    return this
  }

  /**
   * Apply the callback's query changes if the given "value" is true.
   *
   * @param  {*}  value
   * @param  {function}  callback
   * @param  {function}  defaultValue
   * @return {*}
   */
  when (value, callback, defaultValue = null) {
    if (value) {
      const result = callback(this, value)

      return result || this
    } else if (defaultValue) {
      const result = defaultValue(this, value)

      return result || this
    }

    return this
  }

  /**
   * Add a basic where clause to the query.
   *
   * @param  {string|array}  column
   * @param  {string}  operator
   * @param  {*}   value
   * @param  {string}  booleanOperator
   * @return {Builder}
   *
   * @throws {\InvalidArgumentException}
   */
  where (column, operator = null, value = null, booleanOperator = 'and') {
    // If the column is an array, we will assume it is an array of key-value pairs
    // and can add them each as a where clause. We will maintain the boolean we
    // received when the method was called and pass it into the nested where.
    if (Array.isArray(column) === true) {
      return this._addArrayOfWheres(column, booleanOperator)
    }

    // Here we will make some assumptions about the operator. If only 2 values are
    // passed to the method, we will assume that the operator is an equals sign
    // and keep going. Otherwise, we'll require the operator to be passed in.
    [value, operator] = this._prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    // If the columns is actually a Closure instance, we will assume the developer
    // wants to begin a nested where statement which is wrapped in parenthesis.
    // We'll add that Closure to the query then return back out immediately.
    if (typeof column === 'function') {
      return this.whereNested(column, booleanOperator)
    }

    // If the given operator is not found in the list of valid operators we will
    // assume that the developer is just short-cutting the '=' operators and
    // we will set the operators to '=' and set the values appropriately.
    if (this._invalidOperator(operator)) {
      [value, operator] = [operator, '=']
    }

    // If the value is a Closure, it means the developer is performing an entire
    // sub-select within the query and we will need to compile the sub-select
    // within the where clause to get the appropriate query record results.
    if (typeof value === 'function') {
      return this._whereSub(column, operator, value, booleanOperator)
    }

    // If the value is "null", we will just assume the developer wants to add a
    // where null clause to the query. So, we will allow a short-cut here to
    // that method for convenience so the developer doesn't have to check.
    if (value === null) {
      return this.whereNull(column, booleanOperator, operator !== '=')
    }

    // If the column is making a JSON reference we'll check to see if the value
    // is a boolean. If it is, we'll add the raw boolean string as an actual
    // value to the query to ensure this is properly handled by the query.
    if (column.includes(column, '.') && typeof value === 'boolean') {
      value = new Expression(value ? 'true' : 'false')
    }

    // Now that we are working with just a simple query we can put the elements
    // in our array and add the query binding to our array of bindings that
    // will be bound to each SQL statements when it is finally executed.
    const type = 'Basic'

    this.wheres.push({
      type, column, operator, value, 'boolean': booleanOperator
    })

    if (value instanceof Expression === false) {
      this.addBinding(value, 'where')
    }

    return this
  }

  /**
   * Add a "where" clause comparing two columns to the query.
   *
   * @param  {string|array}  first
   * @param  {string|null}  operator
   * @param  {string|null}  second
   * @param  {string|null}  booleanOperator
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  whereColumn (first, operator = null, second = null, booleanOperator = 'and') {
    // If the column is an array, we will assume it is an array of key-value pairs
    // and can add them each as a where clause. We will maintain the boolean we
    // received when the method was called and pass it into the nested where.
    if (Array.isArray(first)) {
      return this._addArrayOfWheres(first, booleanOperator, 'whereColumn')
    }

    // If the given operator is not found in the list of valid operators we will
    // assume that the developer is just short-cutting the '=' operators and we will
    // set the operators to '=' and set the values appropriately.
    if (this._invalidOperator(operator)) {
      [second, operator] = [operator, '=']
    }

    // Finally, we will add this where clause into this array of clauses that we are
    // building for the query. All of them will be compiled via a grammar once the
    // query is about to be executed and run against the database.
    const type = 'Column'

    this.wheres.push({
      type,
      first,
      operator,
      second,
      'boolean': booleanOperator
    })

    return this
  }

  /**
   * Add a nested where statement to the query.
   *
   * @param  {function} callback
   * @param  {string}   boolean
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  whereNested (callback, boolean = 'and') {
    const query = this.forNestedWhere()

    callback(query)

    return this.addNestedWhereQuery(query, boolean)
  }

  /**
   * Add a "where null" clause to the query.
   *
   * @param  {string}  column
   * @param  {string}  boolean
   * @param  {boolean}    not
   * @return {this}
   */
  whereNull (column, boolean = 'and', not = false) {
    const type = not ? 'NotNull' : 'Null'

    this.wheres.push({type, column, boolean})

    return this
  }
}
