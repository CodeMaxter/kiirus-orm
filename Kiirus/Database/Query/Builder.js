'use strict'

const Arr = require('./../../Support/Arr')
// const Collection = require('./../../Support/Collection')
const Expression = require('./Expression')
const Helper = require('./../../Support/Helper')
const JoinClause = require('./JoinClause')
const KiirusBuilder = require('./../Ceres/Builder')

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
     * The groupings for the query.
     *
     * @var {array}
     */
    this.groups = []

    /**
     * The having constraints for the query.
     *
     * @var {array}
     */
    this.havings = []

    /**
     * The table joins for the query.
     *
     * @var {array}
     */
    this.joins = []

    /**
     * The maximum number of records to return.
     *
     * @var {number}
     */
    this.limitProperty = undefined

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
     * The number of records to skip.
     *
     * @var {number}
     */
    this.offsetProperty = undefined

    /**
     * The orderings for the query.
     *
     * @var {array}
     */
    this.orders = []

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
     * The maximum number of union records to return.
     *
     * @var {number}
     */
    this.unionLimit = undefined

    /**
     * The query union statements.
     *
     * @var {array}
     */
    this.unions = []

    /**
     * The number of union records to skip.
     *
     * @var {number}
     */
    this.unionOffset = undefined

    /**
     * The orderings for the union query.
     *
     * @var {array}
     */
    this.unionOrders = []

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
   * Add a date based (year, month, day, time) statement to the query.
   *
   * @param  {string}  type
   * @param  {string}  column
   * @param  {string}  operator
   * @param  int  value
   * @param  {string}  boolean
   * @return this
   */
  _addDateBasedWhere (type, column, operator, value, booleanOperator = 'and') {
    this.wheres.push({
      column,
      type,
      'boolean': booleanOperator,
      operator,
      value
    })

    this.addBinding(value, 'where')

    return this
  }

  /**
   * Remove all of the expressions from a list of bindings.
   *
   * @param  {array}  bindings
   * @return {array}
   */
  _cleanBindings (bindings) {
    const result = Object.entries(bindings).map(([key, binding]) => {
      return !(binding instanceof Expression) ? binding : undefined
    }).filter((bindings) => bindings !== undefined)

    return Object.values(result)
  }

  /**
   * Create a new query instance for a sub-query.
   *
   * @return {\Kiirus\Database\Query\Builder}
   */
  _forSubQuery () {
    return this.newQuery()
  }

  /**
   * Determine if the given operator is supported.
   *
   * @param  {string}  operator
   * @return {boolean}
   */
  _invalidOperator (operator) {
    return !this.operators.includes(String(operator).toLowerCase()) &&
      !this.grammar.getOperators().includes(String(operator).toLowerCase())
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
   * Parse the sub-select query into SQL and bindings.
   *
   * @param  {*}  query
   * @return {array}
   */
  _parseSubSelect (query) {
    if (query instanceof this.constructor) {
      query.columns = [query.columns[0]]

      return [query.toSql(), query.getBindings()]
    } else if (Helper.isString(query)) {
      return [query, []]
    } else {
      throw new Error('Invalid Argument Exception')
    }
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

  /**
   * Run a pagination count query.
   *
   * @param  {array}  columns
   * @return {array}
   */
  _runPaginationCountQuery (columns = ['*']) {
    // We need to save the original bindings, because the cloneWithoutBindings
    // method delete them from the builder object
    const bindings = Object.assign({}, this.bindings)

    return this.cloneWithout(['columns', 'orders', 'limit', 'offset'])
      .cloneWithoutBindings(['select', 'order'])
      ._setAggregate('count', this._withoutSelectAliases(columns))
      .get().then((result) => {
        this.bindings = bindings

        return result.all()
      })
  }

  /**
   * Run the query as a "select" statement against the connection.
   *
   * @return {Promise}
   */
  _runSelect () {
    return this.connection.select(
      this.toSql(),
      this.getBindings()
    )
  }

  /**
   * Set the aggregate property without running the query.
   *
   * @param  {string}  functionName
   * @param  {array}  columns
   * @return {\Kiirus\Database\Query\Builder}
   */
  _setAggregate (functionName, columns) {
    this.aggregateProperty = {
      functionName,
      columns
    }

    if (Helper.empty(this.groups)) {
      this.orders = undefined

      this.bindings['order'] = []
    }

    return this
  }

  /**
   * Strip off the table name or alias from a column identifier.
   *
   * @param  {string}  column
   * @return {string|undefined}
   */
  _stripTableForPluck (column) {
    return column === undefined ? column : Helper.last(column.split(/~\.| ~/gi))
  }

  /**
   * Add an external sub-select to the query.
   *
   * @param  {string}   column
   * @param  {\Kiirus\Database\Query\Builder|static}  query
   * @param  {string}   booleanOperator
   * @param  {boolean}     not
   * @return {\Kiirus\Database\Query\Builder}
   */
  _whereInExistingQuery (column, query, booleanOperator, not) {
    const type = not ? 'NotInSub' : 'InSub'

    this.wheres.push({
      type,
      column,
      query,
      'boolean': booleanOperator
    })

    this.addBinding(query.getBindings(), 'where')

    return this
  }

  /**
   * Add a where in with a sub-select to the query.
   *
   * @param  {string}   column
   * @param  {function} callback
   * @param  {string}   booleanOperator
   * @param  {boolean}  not
   * @return {\Kiirus\Database\Query\Builder}
   */
  _whereInSub (column, callback, booleanOperator, not) {
    const type = not ? 'NotInSub' : 'InSub'

    // To create the exists sub-select, we will actually create a query and call the
    // provided callback with the query so the developer may set any of the query
    // conditions they want for the in clause, then we'll put it in this array.
    const query = this._forSubQuery()

    callback(query)

    this.wheres.push({
      type,
      column,
      query,
      'boolean': booleanOperator
    })

    this.addBinding(query.getBindings(), 'where')

    return this
  }

  /**
   * Add a full sub-select to the query.
   *
   * @param  {string}   column
   * @param  {string}   operator
   * @param  {function} callback
   * @param  {string}   booleanOperator
   * @return {this}
   */
  _whereSub (column, operator, callback, booleanOperator) {
    const type = 'Sub'

    const query = this._forSubQuery()

    // Once we have the query instance we can simply execute it so it can add all
    // of the sub-select's conditions to itself, and then we can cache it off
    // in the array of where clauses for the "main" parent query instance.
    callback(query)

    this.wheres.push({
      type,
      column,
      operator,
      query,
      'boolean': booleanOperator
    })

    this.addBinding(query.getBindings(), 'where')

    return this
  }

  /**
   * Remove the column aliases since they will break count queries.
   *
   * @param  {array}  columns
   * @return {array}
   */
  _withoutSelectAliases (columns) {
    return columns.map((column) => {
      const aliasPosition = column.toLowerCase().indexOf(' as ')

      return Helper.isString(column) && (aliasPosition) !== -1
        ? column.substr(0, aliasPosition) : column
    })
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
   * @param  {string}  booleanOperator
   * @return {this}
   */
  addNestedWhereQuery (query, booleanOperator = 'and') {
    if (query.wheres.length > 0) {
      const type = 'Nested'

      this.wheres.push({
        type,
        query,
        'boolean':
        booleanOperator
      })

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

    this.columns = Helper.merge(this.columns || [], column)

    return this
  }

  /**
   * Add an exists clause to the query.
   *
   * @param  {\Kiirus\Database\Query\Builder} query
   * @param  {string}  booleanOperator
   * @param  {boolean}  not
   * @return {\Kiirus\Database\Query\Builder}
   */
  addWhereExistsQuery (query, booleanOperator = 'and', not = false) {
    const type = not ? 'NotExists' : 'Exists'

    this.wheres.push({
      type,
      query,
      'boolean': booleanOperator
    })

    this.addBinding(query.getBindings(), 'where')

    return this
  }

  /**
   * Execute an aggregate function on the database.
   *
   * @param  {string}  functionName
   * @param  {array}   columns
   * @return {*}
   */
  aggregate (functionName, columns = ['*']) {
    // We need to save the original bindings, because the cloneWithoutBindings
    // method delete them from the builder object
    const bindings = Object.assign({}, this.bindings)

    return this.cloneWithout(['columns'])
      .cloneWithoutBindings(['select'])
      ._setAggregate(functionName, columns)
      .get(columns).then((results) => {
        if (!results.isEmpty()) {
          this.bindings = bindings

          return Number(Helper.changeKeyCase(results[0])['aggregate'])
        }
      })
  }

  /**
   * Clone the query without the given properties.
   *
   * @param  {array}  except
   * @return {\Kiirus\Database\Query\Builder}
   */
  cloneWithout (except) {
    return Helper.tap(Helper.clone(this), (clone) => {
      for (let property of except) {
        clone[property] = undefined
      }
    })
  }

  /**
   * Clone the query without the given bindings.
   *
   * @param  {array}  except
   * @return {\Kiirus\Database\Query\Builder}
   */
  cloneWithoutBindings (except) {
    return Helper.tap(Helper.clone(this), (clone) => {
      for (let type of except) {
        clone.bindings[type] = []
      }
    })
  }

  /**
   * Add a "cross join" clause to the query.
   *
   * @param  {string}  table
   * @param  {string|undefined}  first
   * @param  {string|undefined}  operator
   * @param  {string|undefined}  second
   * @return {\Kiirus\Database\Query\Builder}
   */
  crossJoin (table, first = null, operator = null, second = null) {
    if (first) {
      return this.join(table, first, operator, second, 'cross')
    }

    this.joins.push(new JoinClause(this, 'cross', table))

    return this
  }

  /**
   * Retrieve the "count" result of the query.
   *
   * @param  {string}  columns
   * @return {number}
   */
  count (columns = '*') {
    return this.aggregate('count', Arr.wrap(columns))
  }

  /**
   * Force the query to only return distinct results.
   *
   * @return {\Kiirus\Database\Query\Builder}
   */
  distinct () {
    this.distinctProperty = true

    return this
  }

  /**
   * Determine if any rows exist for the current query.
   *
   * @return {boolean}
   */
  exists () {
    return this.connection.select(
      this.grammar.compileExists(this),
      this.getBindings()
    ).then((results) => {
      // If the results has rows, we will get the row and see if the exists column is a
      // boolean true. If there is no results for this query we will return false as
      // there are no rows for this query at all and we can return that info here.
      if (Helper.isSet(results[0])) {
        results = results[0]

        return Boolean(results.exists)
      }

      return false
    })
  }

  /**
   * Execute a query for a single record by ID.
   *
   * @param  {number} id
   * @param  {array}  columns
   * @return {Promise</Kiirus/Database/Ceres/Collection>}
   */
  find (id, columns = ['*']) {
    return this.where('id', '=', id).first(columns)
  }

  /**
   * Execute the query and get the first result.
   *
   * @param  array  columns
   * @return {\Illuminate\Database\Eloquent\Model|\Kiirus\Database\Query\Builder|undefined}
   */
  first (columns = ['*']) {
    return this.take(1).get(columns).then((results) => {
      return results.first()
    })
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
   * Set the limit and offset for a given page.
   *
   * @param  {number}  page
   * @param  {number}  perPage
   * @return {\Illuminate\Database\Query\Builder}
   */
  forPage (page, perPage = 15) {
    return this.skip((page - 1) * perPage).take(perPage)
  }

  /**
   * Execute the query as a "select" statement.
   *
   * @param  {array}  columns
   * @return {Promise</Kiirus/Database/Ceres/Collection>}
   */
  get (columns = ['*']) {
    const original = this.columns

    if (original === undefined) {
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
   * Get the count of the total records for the paginator.
   *
   * @param  {array}  columns
   * @return {number}
   */
  getCountForPagination (columns = ['*']) {
    return this._runPaginationCountQuery(columns).then((results) => {
      // Once we have run the pagination count query, we will get the resulting count and
      // take into account what type of query it was. When there is a group by we will
      // just return the count of the entire results set since that will be correct.
      if (Helper.isSet(this.groups) && this.groups.length > 0) {
        return results.length
      } else if (!Helper.isSet(results[0])) {
        return 0
      } else if (Helper.isObject(results[0])) {
        return Number(results[0].aggregate)
      }/*  else {
        return Number(results[0]['aggregate'])
      } */
      // TODO: Verify this condition
    })
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
   * Add a "group by" clause to the query.
   *
   * @param  {array}  ...groups
   * @return {\Kiirus\Database\Query\Builder}
   */
  groupBy (...groups) {
    for (let group of groups) {
      this.groups = Helper.merge(
        this.groups,
        Arr.wrap(group)
      )
    }

    return this
  }

  /**
   * Add a "having" clause to the query.
   *
   * @param  {string}  column
   * @param  {string|null}  operator
   * @param  {string|null}  value
   * @param  {string}  booleanOperator
   * @return {\Kiirus\Database\Query\Builder}
   */
  having (column, operator = undefined, value = undefined, booleanOperator = 'and') {
    // Here we will make some assumptions about the operator. If only 2 values are
    // passed to the method, we will assume that the operator is an equals sign
    // and keep going. Otherwise, we'll require the operator to be passed in.
    [value, operator] = this._prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    // If the given operator is not found in the list of valid operators we will
    // assume that the developer is just short-cutting the '=' operators and
    // we will set the operators to '=' and set the values appropriately.
    if (this._invalidOperator(operator)) {
      [value, operator] = [operator, '=']
    }

    const type = 'Basic'

    this.havings.push({
      type,
      column,
      operator,
      value,
      'boolean': booleanOperator
    })

    if (!(value instanceof Expression)) {
      this.addBinding(value, 'having')
    }

    return this
  }

  /**
   * Add a raw having clause to the query.
   *
   * @param  {string}  sql
   * @param  {array}   bindings
   * @param  {string}  booleanOperator
   * @return {\Kiirus\Database\Query\Builder}
   */
  havingRaw (sql, bindings = [], booleanOperator = 'and') {
    const type = 'Raw'

    this.havings.push({
      type,
      sql,
      'boolean': booleanOperator
    })

    this.addBinding(bindings, 'having')

    return this
  }

  /**
   * Concatenate values of a given column as a string.
   *
   * @param  {string}  column
   * @param  {string}  glue
   * @return {string}
   */
  implode (column, glue = '') {
    return this.pluck(column).then((results) => {
      return results.implode(glue)
    })
  }

  /**
   * Insert a new record into the database.
   *
   * @param  {array}  values
   * @return {boolean}
   */
  insert (values) {
    // Since every insert gets treated like a batch insert, we will make sure the
    // bindings are structured in a way that is convenient when building these
    // inserts statements by verifying these elements are actually an array.
    if (Helper.empty(values)) {
      return true
    }

    if (!Array.isArray(values)) {
      values = [values]
    } else {
      // Here, we will sort the insert keys for every record so that each insert is
      // in the same order for the record. We need to make sure this is the case
      // so there are not any errors or problems when inserting these records.
      for (const [key, value] of values.entries()) {
        Helper.ksort(value)

        values[key] = value
      }
    }

    // Finally, we will run this query against the database connection and return
    // the results. We will need to also flatten these bindings before running
    // the query so they are all in one huge, flattened array for execution.
    return this.connection.insert(
      this.grammar.compileInsert(this, values),
      this._cleanBindings(Arr.flatten(values, 1))
    )
  }

  /**
   * Insert a new record and get the value of the primary key.
   *
   * @param  {array}   values
   * @param  {string|undefined}  sequence
   * @return {Promise<Number>}
   */
  insertGetId (values, sequence = undefined) {
    const sql = this.grammar.compileInsertGetId(this, values, sequence)

    values = this._cleanBindings(values)

    return this.processor.processInsertGetId(this, sql, values, sequence)
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
  join (table, first, operator = undefined, second = undefined, type = 'inner', where = false) {
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
   * Add a "join where" clause to the query.
   *
   * @param  {string}  table
   * @param  {string}  first
   * @param  {string}  operator
   * @param  {string}  second
   * @param  {string}  type
   * @return {\Kiirus\Database\Query\Builder}
   */
  joinWhere (table, first, operator, second, type = 'inner') {
    return this.join(table, first, operator, second, type, true)
  }

  /**
   * Add a left join to the query.
   *
   * @param  {string}  table
   * @param  {string}  first
   * @param  {string|null}  operator
   * @param  {string|null}  second
   * @return {\Illuminate\Database\Query\Builder}
   */
  leftJoin (table, first, operator = null, second = null) {
    return this.join(table, first, operator, second, 'left')
  }

  /**
   * Add a "join where" clause to the query.
   *
   * @param  string  table
   * @param  string  first
   * @param  string  operator
   * @param  string  second
   * @return {\Illuminate\Database\Query\Builder}
   */
  leftJoinWhere (table, first, operator, second) {
    return this.joinWhere(table, first, operator, second, 'left')
  }

  /**
   * Set the "limit" value of the query.
   *
   * @param  {number}  value
   * @return {\Kiirus\Database\Query\Builder}
   */
  limit (value) {
    const property = this.unions.length > 0 ? 'unionLimit' : 'limitProperty'

    if (value >= 0) {
      this[property] = value
    }

    return this
  }

  /**
   * Retrieve the minimum value of a given column.
   *
   * @param  {string}  column
   * @return {*}
   */
  min (column) {
    return this.aggregate('min', [column])
  }

  /**
   * Retrieve the maximum value of a given column.
   *
   * @param  {string}  column
   * @return {*}
   */
  max (column) {
    return this.aggregate('max', [column])
  }

  /**
   * Get a new instance of the query builder.
   *
   * @return {\Kiirus\Database\Query\Builder}
   */
  newQuery () {
    return new Builder(this.connection, this.grammar, this.processor)
  }

  /**
   * Set the "offset" value of the query.
   *
   * @param  {number}  value
   * @return this
   */
  offset (value) {
    const property = this.unions.length > 0 ? 'unionOffset' : 'offsetProperty'

    this[property] = Math.max(0, value)

    return this
  }

  /**
   * Add an "order by" clause to the query.
   *
   * @param  {string}  column
   * @param  {string}  direction
   * @return {\Kiirus\Database\Query\Builder}
   */
  orderBy (column, direction = 'asc') {
    this[this.unions.length > 0 ? 'unionOrders' : 'orders'].push({
      column,
      'direction': direction.toLowerCase() === 'asc' ? 'asc' : 'desc'
    })

    return this
  }

  /**
   * Add a descending "order by" clause to the query.
   *
   * @param  {string}  column
   * @return {\Kiirus\Database\Query\Builder}
   */
  orderByDesc (column) {
    return this.orderBy(column, 'desc')
  }

  /**
   * Add a raw "order by" clause to the query.
   *
   * @param  {string}  sql
   * @param  {array}  bindings
   * @return {\Kiirus\Database\Query\Builder}
   */
  orderByRaw (sql, bindings = []) {
    const type = 'Raw'

    this[this.unions ? 'unionOrders' : 'orders'].push({type, sql})

    this.addBinding(bindings, 'order')

    return this
  }

  /**
   * Add a "or having" clause to the query.
   *
   * @param  {string}  column
   * @param  {string|null}  operator
   * @param  {string|null } value
   * @return {\Kiirus\Database\Query\Builder}
   */
  orHaving (column, operator = undefined, value = undefined) {
    return this.having(column, operator, value, 'or')
  }

  /**
   * Add a raw or having clause to the query.
   *
   * @param  {string}  sql
   * @param  {array}   bindings
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  orHavingRaw (sql, bindings = []) {
    return this.havingRaw(sql, bindings, 'or')
  }

  /**
   * Add an "or where" clause to the query.
   *
   * @param  {string|array|function}  column
   * @param  {string}  operator
   * @param  {*}   value
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  orWhere (column, operator = undefined, value = undefined) {
    return this.where(column, operator, value, 'or')
  }

  /**
   * Add an "or where" clause comparing two columns to the query.
   *
   * @param  {string|array}  first
   * @param  {string|null}  operator
   * @param  {string|null}  second
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  orWhereColumn (first, operator = undefined, second = undefined) {
    return this.whereColumn(first, operator, second, 'or')
  }

  /**
   * Add an or exists clause to the query.
   *
   * @param  {function} callback
   * @param  {boolean}  not
   * @return {\Kiirus\Database\Query\Builder}
   */
  orWhereExists (callback, not = false) {
    return this.whereExists(callback, 'or', not)
  }

  /**
   * Add an "or where in" clause to the query.
   *
   * @param  {string}  column
   * @param  {*}   values
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  orWhereIn (column, values) {
    return this.whereIn(column, values, 'or')
  }

  /**
   * Add a where not exists clause to the query.
   *
   * @param  {function}  callback
   * @return {\Kiirus\Database\Query\Builder}
   */
  orWhereNotExists (callback) {
    return this.orWhereExists(callback, true)
  }

  /**
   * Add an "or where not in" clause to the query.
   *
   * @param  {string}  column
   * @param  {*}   values
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  orWhereNotIn (column, values) {
    return this.whereNotIn(column, values, 'or')
  }

  /**
   * Add an "or where not null" clause to the query.
   *
   * @param  {string}  column
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  orWhereNotNull (column) {
    return this.whereNotNull(column, 'or')
  }

  /**
   * Add an "or where null" clause to the query.
   *
   * @param  {string}  column
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  orWhereNull (column) {
    return this.whereNull(column, 'or')
  }

  /**
   * Add a raw or where clause to the query.
   *
   * @param  {string}  sql
   * @param  {*}   bindings
   * @return{ \Kiirus\Database\Query\Builder|static}
   */
  orWhereRaw (sql, bindings = []) {
    return this.whereRaw(sql, bindings, 'or')
  }

  /**
   * Get an array with the values of a given column.
   *
   * @param  {string}  column
   * @param  {string|undefined}  key
   * @return Promise<{\Kiirus\Support\Collection}>
   */
  pluck (column, key = undefined) {
    return this.get(key === undefined ? [column] : [column, key]).then((results) => {
      // If the columns are qualified with a table or have an alias, we cannot use
      // those directly in the "pluck" operations since the results from the DB
      // are only keyed by the column itself. We'll strip the table out here.
      return results.pluck(
        this._stripTableForPluck(column),
        this._stripTableForPluck(key)
      )
    })
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
   * Add a new "raw" select expression to the query.
   *
   * @param  {string}  expression
   * @param  {array}   bindings
   * @return {\Illuminate\Database\Query\Builder}
   */
  selectRaw (expression, bindings = []) {
    this.addSelect(new Expression(expression))

    if (bindings) {
      this.addBinding(bindings, 'select')
    }

    return this
  }

  /**
   * Add a subselect expression to the query.
   *
   * @param  {\function|\Kiirus\Database\Query\Builder|string} query
   * @param  {string}  as
   * @return {\Kiirus\Database\Query\Builder}
   *
   * @throws {\InvalidArgumentException}
   */
  selectSub (query, as) {
    // If the given query is a Closure, we will execute it while passing in a new
    // query instance to the Closure. This will give the developer a chance to
    // format and work with the query before we cast it to a raw SQL string.
    if (typeof query === 'function') {
      const callback = query

      query = this._forSubQuery()

      callback(query)
    }

    // Here, we will parse this query into an SQL string and an array of bindings
    // so we can add it to the query builder using the selectRaw method so the
    // query is included in the real SQL generated by this builder instance.
    let bindings

    [query, bindings] = this._parseSubSelect(query)

    return this.selectRaw(
      '(' + query + ') as ' + this.grammar.wrap(as), bindings
    )
  }

  /**
   * Alias to set the "offset" value of the query.
   *
   * @param  {number}  value
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  skip (value) {
    return this.offset(value)
  }

  /**
   * Retrieve the sum of the values of a given column.
   *
   * @param  {string}  column
   * @return {*}
   */
  sum (column) {
    return this.aggregate('sum', [column]).then((result) => {
      return result || 0
    })
  }

  /**
   * Alias to set the "limit" value of the query.
   *
   * @param  {number}  value
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  take (value) {
    return this.limit(value)
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
   * Update a record in the database.
   *
   * @param  {array}  values
   * @return {number}
   */
  update (values) {
    const sql = this.grammar.compileUpdate(this, values)

    return this.connection.update(sql, this._cleanBindings(
      this.grammar.prepareBindingsForUpdate(this.bindings, values)
    ))
  }

  /**
   * Add a union statement to the query.
   *
   * @param  {\Kiirus\Database\Query\Builder|static}
   */
  union (query, all = false) {
    if (typeof query === 'function') {
      const newQuery = this.newQuery()

      query(newQuery)

      query = newQuery
    }

    this.unions.push({
      query,
      all
    })

    this.addBinding(query.getBindings(), 'union')

    return this
  }

  /**
   * Add a union all statement to the query.
   *
   * @param  {\Kiirus\Database\Query\Builder|function}  query
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  unionAll (query) {
    return this.union(query, true)
  }

  /**
   * Apply the callback's query changes if the given "value" is false.
   *
   * @param  {*}  value
   * @param  {function}  callback
   * @param  {function}  default
   * @return {*}
   */
  unless (value, callbackFunc, defaultValue = undefined) {
    if (!value) {
      const result = callbackFunc(this, value)

      return result || this
    } else if (defaultValue) {
      const result = defaultValue(this, value)

      return result || this
    }

    return this
  }

  /**
   * Get a single column's value from the first result of a query.
   *
   * @param  {string}  column
   * @return {*}
   */
  value (column) {
    return this.first([column]).then((result) => {
      return Object.keys(result).length > 0 ? result[column] : undefined
    })
  }

  /**
   * Apply the callback's query changes if the given "value" is true.
   *
   * @param  {*}  value
   * @param  {function}  callback
   * @param  {function}  defaultValue
   * @return {*}
   */
  when (value, callbackFunc, defaultValue = undefined) {
    if (value) {
      const result = callbackFunc(this, value)

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
   * @return {\Kiirus\Database\Query\Builder}
   *
   * @throws {\InvalidArgumentException}
   */
  where (column, operator = undefined, value = undefined, booleanOperator = 'and') {
    // If the column is an array, we will assume it is an array of key-value pairs
    // and can add them each as a where clause. We will maintain the boolean we
    // received when the method was called and pass it into the nested where.
    if (Array.isArray(column) === true || Helper.isObject(column) === true) {
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

    // If the value is "undefined", we will just assume the developer wants to
    // add a where null clause to the query. So, we will allow a short-cut here
    // to that method for convenience so the developer doesn't have to check.
    if (value === undefined) {
      return this.whereNull(column, booleanOperator, operator !== '=')
    }

    // If the column is making a JSON reference we'll check to see if the value
    // is a boolean. If it is, we'll add the raw boolean string as an actual
    // value to the query to ensure this is properly handled by the query.
    if (column.includes('.') && typeof value === 'boolean') {
      value = new Expression(value ? 'true' : 'false')
    }

    // Now that we are working with just a simple query we can put the elements
    // in our array and add the query binding to our array of bindings that
    // will be bound to each SQL statements when it is finally executed.
    const type = 'Basic'

    this.wheres.push({
      type,
      column,
      operator,
      value,
      'boolean': booleanOperator
    })

    if (value instanceof Expression === false) {
      this.addBinding(value, 'where')
    }

    return this
  }

  /**
   * Add a where between statement to the query.
   *
   * @param  {string}  column
   * @param  {array}   values
   * @param  {string}  booleanOperator
   * @param  {boolean}  not
   * @return {\Kiirus\Database\Query\Builder}
   */
  whereBetween (column, values, booleanOperator = 'and', not = false) {
    const type = 'Between'

    this.wheres.push({
      column,
      type,
      boolean: booleanOperator,
      not
    })

    this.addBinding(values, 'where')

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
  whereColumn (first, operator = undefined, second = undefined, booleanOperator = 'and') {
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
   * Add a "where date" statement to the query.
   *
   * @param  {string}  column
   * @param  {string}  operator
   * @param  {*}  value
   * @param  {string}  booleanOperator
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  whereDate (column, operator, value = undefined, booleanOperator = 'and') {
    [value, operator] = this._prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this._addDateBasedWhere('Date', column, operator, value, booleanOperator)
  }

  /**
   * Add a "where day" statement to the query.
   *
   * @param  {string}  column
   * @param  {string}  operator
   * @param  {*}  value
   * @param  {string}  booleanOperator
   * @return {\Kiirus\Database\Query\Builder}
   */
  whereDay (column, operator, value = undefined, booleanOperator = 'and') {
    [value, operator] = this._prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this._addDateBasedWhere('Day', column, operator, value, booleanOperator)
  }

  /**
   * Add an exists clause to the query.
   *
   * @param  {function} callback
   * @param  {string}   boolean
   * @param  {boolean}     not
   * @return {this}
   */
  whereExists (callback, boolean = 'and', not = false) {
    const query = this._forSubQuery()

    // Similar to the sub-select clause, we will create a new query instance so
    // the developer may cleanly specify the entire exists query and we will
    // compile the whole thing in the grammar and insert it into the SQL.
    callback(query)

    return this.addWhereExistsQuery(query, boolean, not)
  }

  /**
   * Add a "where in" clause to the query.
   *
   * @param  {string}  column
   * @param  {*}   values
   * @param  {string}  booleanOperator
   * @param  {boolean}    not
   * @return this
   */
  whereIn (column, values, booleanOperator = 'and', not = false) {
    const type = not ? 'NotIn' : 'In'

    if (values instanceof KiirusBuilder) {
      values = values.getQuery()
    }

    // If the value is a query builder instance we will assume the developer wants to
    // look for any values that exists within this given query. So we will add the
    // query accordingly so that this query is properly executed when it is run.
    if (values instanceof Builder) {
      return this._whereInExistingQuery(
        column, values, booleanOperator, not
      )
    }

    // If the value of the where in clause is actually a Closure, we will assume that
    // the developer is using a full sub-select for this "in" statement, and will
    // execute those Closures, then we can re-construct the entire sub-selects.
    if (typeof values === 'function') {
      return this._whereInSub(column, values, booleanOperator, not)
    }

    // Next, if the value is Arrayable we need to cast it to its raw array form so we
    // have the underlying array value instead of an Arrayable object which is not
    // able to be added as a binding, etc. We will then add to the wheres array.
    if (Array.isArray(values)) {
      values = Array.from(values)
    }

    this.wheres.push({
      type,
      column,
      values,
      'boolean': booleanOperator
    })

    // Finally we'll add a binding for each values unless that value is an expression
    // in which case we will just skip over it since it will be the query as a raw
    // string and not as a parameterized place-holder to be replaced by the PDO.
    for (let value of values) {
      if (!(value instanceof Expression)) {
        this.addBinding(value, 'where')
      }
    }

    return this
  }

  /**
   * Add a "where month" statement to the query.
   *
   * @param  {string}  column
   * @param  {string}  operator
   * @param  {*}  value
   * @param  {string}  booleanOperator
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  whereMonth (column, operator, value = undefined, booleanOperator = 'and') {
    [value, operator] = this._prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this._addDateBasedWhere('Month', column, operator, value, booleanOperator)
  }

  /**
   * Add a where not between statement to the query.
   *
   * @param  {string}  column
   * @param  {array}   values
   * @param  {string}  booleanOperator
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  whereNotBetween (column, values, booleanOperator = 'and') {
    return this.whereBetween(column, values, booleanOperator, true)
  }

  /**
   * Add a where not exists clause to the query.
   *
   * @param  {function} callback
   * @param  {string}   booleanOperator
   * @return {\Kiirus\Database\Query\Builder}
   */
  whereNotExists (callback, booleanOperator = 'and') {
    return this.whereExists(callback, booleanOperator, true)
  }

  /**
   * Add a "where not in" clause to the query.
   *
   * @param  {string}  column
   * @param  {*}   values
   * @param  {string}  boolean
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  whereNotIn (column, values, boolean = 'and') {
    return this.whereIn(column, values, boolean, true)
  }

  /**
   * Add a "where not null" clause to the query.
   *
   * @param  {string}  column
   * @param  {string}  booleanOperator
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  whereNotNull (column, booleanOperator = 'and') {
    return this.whereNull(column, booleanOperator, true)
  }

  /**
   * Add a "where null" clause to the query.
   *
   * @param  {string}  column
   * @param  {string}  booleanOperator
   * @param  {boolean} not
   * @return {this}
   */
  whereNull (column, booleanOperator = 'and', not = false) {
    const type = not ? 'NotNull' : 'Null'

    this.wheres.push({
      type,
      column,
      'boolean': booleanOperator
    })

    return this
  }

  /**
   * Add a raw where clause to the query.
   *
   * @param  {string}  sql
   * @param  {*}   bindings
   * @param  {string}  booleanOperator
   * @return {\Kiirus\Database\Query\Builder}
   */
  whereRaw (sql, bindings = [], booleanOperator = 'and') {
    this.wheres.push({
      'type': 'Raw',
      sql,
      'boolean': booleanOperator
    })

    this.addBinding(bindings, 'where')

    return this
  }

  /**
   * Add a "where year" statement to the query.
   *
   * @param  {string}  column
   * @param  {string}  operator
   * @param  {*}  value
   * @param  {string}  booleanOperator
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  whereYear (column, operator, value = undefined, booleanOperator = 'and') {
    [value, operator] = this._prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this._addDateBasedWhere('Year', column, operator, value, booleanOperator)
  }

  /**
   * Add a nested where statement to the query.
   *
   * @param  {function} callback
   * @param  {string}   booleanOperator
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  whereNested (callback, booleanOperator = 'and') {
    const query = this.forNestedWhere()

    callback(query)

    return this.addNestedWhereQuery(query, booleanOperator)
  }

  /**
   * Add a "where time" statement to the query.
   *
   * @param  {string}  column
   * @param  {string}   operator
   * @param  {number}   value
   * @param  {string}   booleanOperator
   * @return {\Kiirus\Database\Query\Builder|static}
   */
  whereTime (column, operator, value, booleanOperator = 'and') {
    return this._addDateBasedWhere('Time', column, operator, value, booleanOperator)
  }
}
