'use strict'

const BaseGrammar = require('./../../Grammar')
const Collection = require('./../../../Support/Collection')
const Helper = require('./../../../Support/Helper')
const JoinClause = require('./../JoinClause')
const Str = require('./../../../Support/Str')

module.exports = class Grammar extends BaseGrammar {
  constructor () {
    super()

    /**
     * The grammar specific operators.
     *
     * @var {array}
     */
    this._operators = []

    /**
     * The components that make up a select clause.
     *
     * @var {array}
     */
    this._selectComponents = [
      {name: 'aggregate', translated: 'aggregateProperty'},
      {name: 'columns', translated: 'columns'},
      {name: 'from', translated: 'table'},
      {name: 'joins', translated: 'joins'},
      {name: 'wheres', translated: 'wheres'},
      {name: 'groups', translated: 'groups'},
      {name: 'havings', translated: 'havings'},
      {name: 'orders', translated: 'orders'},
      {name: 'limit', translated: 'limitProperty'},
      {name: 'offset', translated: 'offsetProperty'},
      {name: 'unions', translated: 'unions'},
      {name: 'lock', translated: 'lockProperty'}
    ]
  }

  /**
   * Compile an aggregated select clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {object}  aggregate
   * @return {string}
   */
  _compileAggregate (query, aggregate) {
    let column = this.columnize(aggregate.columns)

    // If the query has a "distinct" constraint and we're not asking for all columns
    // we need to prepend "distinct" onto the column name so that the query takes
    // it into account when it performs the aggregating operations on the data.
    if (query.distinct && column !== '*') {
      column = 'distinct ' + column
    }

    return 'select ' + aggregate.functionName + '(' + column + ') as aggregate'
  }

  /**
   * Compile the "select *" portion of the query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  columns
   * @return {string|null}
   */
  _compileColumns (query, columns) {
    // If the query is actually performing an aggregating select, we will let that
    // compiler handle the building of the select clauses, as it will need some
    // more syntax that is best handled by that function to keep things neat.
    if (query.aggregateProperty !== undefined) {
      return
    }

    let select = query.distinctProperty ? 'select distinct ' : 'select '

    return select + this.columnize(columns)
  }

  /**
   * Compile the components necessary for a select clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {object}
   */
  _compileComponents (query) {
    const sql = []

    this._selectComponents.map((component) => {
      // To compile the query, we'll spin through each component of the query and
      // see if that component exists. If it does we'll just call the compiler
      // function for the component which is responsible for making the SQL.
      if (query[component.translated] !== undefined) {
        const method = '_compile' + Str.ucfirst(component.name)

        sql[component.name] = this[method](query, query[component.translated])
      }
    })

    return sql
  }

  /**
   * Compile the "from" portion of the query.
   *
   * @param  \Kiirus\Database\Query\Builder  query
   * @param  {string}  table
   * @return {string}
   */
  _compileFrom (query, table) {
    return 'from ' + this.wrapTable(table)
  }

  /**
   * Compile the "join" portions of the query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  joins
   * @return {string}
   */
  _compileJoins (query, joins) {
    return joins.map((join) => {
      const table = this.wrapTable(join.table)

      return `${join.type} join ${table} ${this._compileWheres(join)}`.trim()
    }).join(' ')
  }

  /**
   * Compile the "limit" portions of the query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {number}  limit
   * @return {string}
   */
  _compileLimit (query, limit) {
    return 'limit ' + limit
  }

  /**
   * Compile the "offset" portions of the query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {number}  offset
   * @return {string}
   */
  _compileOffset (query, offset) {
    return 'offset ' + offset
  }

  /**
   * Compile the "order by" portions of the query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  orders
   * @return {string}
   */
  _compileOrders (query, orders) {
    if (!Helper.empty(orders)) {
      return 'order by ' + this._compileOrdersToArray(query, orders).join(', ')
    }

    return ''
  }

  /**
   * Compile the query orders to an array.
   *
   * @param  {\Kiirus\Database\Query\Builder}
   * @param  {array}  orders
   * @return {array}
   */
  _compileOrdersToArray (query, orders) {
    return orders.map((order) => {
      return !Helper.isSet(order.sql)
        ? this.wrap(order.column) + ' ' + order.direction
        : order.sql
    })
  }

  /**
   * Compile a single union statement.
   *
   * @param  {object}  union
   * @return {string}
   */
  _compileUnion (union) {
    const conjuction = union.all ? ' union all ' : ' union '

    return conjuction + union.query.toSql()
  }

  /**
   * Compile the "union" queries attached to the main query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  _compileUnions (query) {
    let sql = ''

    for (let key in query.unions) {
      sql += this._compileUnion(query.unions[key])
    }

    if (!Helper.empty(query.unionOrders)) {
      sql += ' ' + this._compileOrders(query, query.unionOrders)
    }

    if (Helper.isSet(query.unionLimit)) {
      sql += ' ' + this._compileLimit(query, query.unionLimit)
    }

    if (Helper.isSet(query.unionOffset)) {
      sql += ' ' + this._compileOffset(query, query.unionOffset)
    }

    return sql.trimLeft()
  }

  /**
   * Compile the "where" portions of the query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  _compileWheres (query) {
    // Each type of where clauses has its own compiler function which is responsible
    // for actually creating the where clauses SQL. This helps keep the code nice
    // and maintainable since each clause has a very small method that it uses.
    if (query.wheres === undefined) {
      return ''
    }

    // If we actually have some where clauses, we will strip off the first boolean
    // operator, which is added by the query builders for convenience so we can
    // avoid checking for the first clauses in each of the compilers methods.
    const sql = this._compileWheresToArray(query)

    if (sql.length > 0) {
      return this._concatenateWhereClauses(query, sql)
    }

    return ''
  }

  /**
   * Get an array of all the where clauses for the query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return array
   */
  _compileWheresToArray (query) {
    return new Collection(query.wheres).map((where) => {
      return where.boolean + ' ' + this[`_where${where.type}`](query, where)
    }).all()
  }

  /**
   * Concatenate an array of segments, removing empties.
   *
   * @param  {array}   segments
   * @return {string}
   */
  _concatenate (segments) {
    const result = []

    for (let segment in segments) {
      if (String(segments[segment]) !== '') {
        result.push(segments[segment])
      }
    }

    return result.join(' ')
  }

  /**
   * Format the where clause statements into one string.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  sql
   * @return {string}
   */
  _concatenateWhereClauses (query, sql) {
    const conjunction = query instanceof JoinClause ? 'on' : 'where'

    return conjunction + ' ' + this._removeLeadingBoolean(sql.join(' '))
  }

  /**
   * Compile a date based where clause.
   *
   * @param  {string}  type
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _dateBasedWhere (type, query, where) {
    const value = this.parameter(where.values)

    return type + '(' + this.wrap(where.column) + ') ' + where.operator + ' ' + value
  }

  /**
   * Remove the leading boolean from a statement.
   *
   * @param  {string}  value
   * @return {string}
   */
  _removeLeadingBoolean (value) {
    return value.replace(/and |or /i, '')
  }

  /**
   * Compile a basic where clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereBasic (query, where) {
    const value = this.parameter(where.value)

    return this.wrap(where.column) + ' ' + where.operator + ' ' + value
  }

  /**
   * Compile a where clause comparing two columns..
   *
   * @param  {\Illuminate\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereColumn (query, where) {
    return this.wrap(where.first) + ' ' + where.operator + ' ' + this.wrap(where.second)
  }

  /**
   * Compile a "where date" clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  array  where
   * @return string
   */
  _whereDate (query, where) {
    return this._dateBasedWhere('date', query, where)
  }

  /**
   * Compile a "where day" clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereDay (query, where) {
    return this._dateBasedWhere('day', query, where)
  }

  /**
   * Compile a "where month" clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereMonth (query, where) {
    return this._dateBasedWhere('month', query, where)
  }

  /**
   * Compile a "where time" clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereTime (query, where) {
    return this._dateBasedWhere('time', query, where)
  }

  /**
   * Compile a "where month" clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereYear (query, where) {
    return this._dateBasedWhere('year', query, where)
  }

  /**
   * Compile a select query into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  compileSelect (query) {
    // If the query does not have any columns set, we'll set the columns to the
    // * character to just get all of the columns from the database. Then we
    // can build the query and concatenate all the pieces together as one.
    const original = query.columns

    if (query.columns === undefined) {
      query.columns = ['*']
    }

    // To compile the query, we'll spin through each component of the query and
    // see if that component exists. If it does we'll just call the compiler
    // function for the component which is responsible for making the SQL.
    const sql = this._concatenate(
      this._compileComponents(query)
    ).trim()

    query.columns = original

    return sql
  }
}
