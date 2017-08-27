'use strict'

const Collection = require('./../../../Support/Collection')
const BaseGrammar = require('./../../Grammar')
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
      return where.boolean + ' ' + this[`_where${where['type']}`](query, where)
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
