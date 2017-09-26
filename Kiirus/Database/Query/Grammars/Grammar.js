'use strict'

const Arr = require('./../../../Support/Arr')
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
    if (query.distinctProperty && column !== '*') {
      column = 'distinct ' + column
    }

    return 'select ' + aggregate.functionName + '(' + column + ') as aggregate'
  }

  /**
   * Compile a basic having clause.
   *
   * @param  {array}   having
   * @return {string}
   */
  _compileBasicHaving (having) {
    const column = this.wrap(having.column)

    const parameter = this.parameter(having.value)

    return having.boolean + ' ' + column + ' ' + having.operator + ' ' + parameter
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
      return ''
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
    const sql = {}

    this._selectComponents.map((component) => {
      // To compile the query, we'll spin through each component of the query and
      // see if that component exists. If it does we'll just call the compiler
      // function for the component which is responsible for making the SQL.
      if (query[component.translated] === 0 || !Helper.empty(query[component.translated])) {
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
   * Compile the "group by" portions of the query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  groups
   * @return {string}
   */
  _compileGroups (query, groups) {
    return 'group by ' + this.columnize(groups)
  }

  /**
   * Compile a single having clause.
   *
   * @param  {array}   having
   * @return {string}
   */
  _compileHaving (having) {
    // If the having clause is "raw", we can just return the clause straight away
    // without doing any more processing on it. Otherwise, we will compile the
    // clause into SQL based on the components that make it up from builder.
    if (having.type === 'Raw') {
      return having.boolean + ' ' + having.sql
    }

    return this._compileBasicHaving(having)
  }

  /**
   * Compile the "having" portions of the query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  havings
   * @return {string}
   */
  _compileHavings (query, havings) {
    const sql = havings.map(this._compileHaving.bind(this)).join(' ')

    return 'having ' + this._removeLeadingBoolean(sql)
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

    for (let union of query.unions) {
      sql += this._compileUnion(union)
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
    if (query.wheres.length === 0) {
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
   * Compile a "between" where clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereBetween (query, where) {
    const between = where.not ? 'not between' : 'between'

    return this.wrap(where.column) + ' ' + between + ' ? and ?'
  }

  /**
   * Compile a where clause comparing two columns..
   *
   * @param  {{\Kiirus\Database\Query\Builder}}  query
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
   * Compile a where exists clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereExists (query, where) {
    return 'exists (' + this.compileSelect(where.query) + ')'
  }

  /**
   * Compile a "where in" clause.
   *
   * @param  {\Kirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereIn (query, where) {
    if (!Helper.empty(where.values)) {
      return this.wrap(where.column) + ' in (' + this.parameterize(where.values) + ')'
    }

    return '0 = 1'
  }

  /**
   * Compile a where in sub-select clause.
   *
   * @param  {{\Kiirus\Database\Query\Builder}}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereInSub (query, where) {
    return this.wrap(where.column) + ' in (' + this.compileSelect(where.query) + ')'
  }

  /**
   * Compile a where condition with a sub-select.
   *
   * @param  {\Kiirus\Database\Query\Builder} query
   * @param  {array}   where
   * @return {string}
   */
  _whereSub (query, where) {
    const select = this.compileSelect(where['query'])

    return this.wrap(where.column) + ' ' + where.operator + ` (${select}s)`
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
   * Compile a nested where clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereNested (query, where) {
    // Here we will calculate what portion of the string we need to remove. If this
    // is a join clause query, we need to remove the "on" portion of the SQL and
    // if it is a normal query we need to take the leading "where" of queries.
    const offset = query instanceof JoinClause ? 3 : 6

    return '(' + this._compileWheres(where['query']).substr(offset) + ')'
  }

  /**
   * Compile a where exists clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereNotExists (query, where) {
    return 'not exists (' + this.compileSelect(where.query) + ')'
  }

  /**
   * Compile a "where not in" clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereNotIn (query, where) {
    if (!Helper.empty(where['values'])) {
      return this.wrap(where.column) + ' not in (' + this.parameterize(where.values) + ')'
    }

    return '1 = 1'
  }

  /**
   * Compile a where not in sub-select clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereNotInSub (query, where) {
    return this.wrap(where.column) + ' not in (' + this.compileSelect(where.query) + ')'
  }

  /**
   * Compile a "where not null" clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereNotNull (query, where) {
    return this.wrap(where.column) + ' is not null'
  }

  /**
   * Compile a "where null" clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereNull (query, where) {
    return this.wrap(where.column) + ' is null'
  }

  /**
   * Compile a raw where clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereRaw (query, where) {
    return where.sql
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
   * Compile a delete statement into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  compileDelete (query) {
    const wheres = Array.isArray(query.wheres) ? this._compileWheres(query) : ''

    return `delete from ${this.wrapTable(query.from)} ${wheres}`.trim()
  }

  /**
   * Compile an exists statement into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  compileExists (query) {
    const select = this.compileSelect(query)

    return `select exists(${select}) as ${this.wrap('exists')}`
  }

  /**
   * Compile an insert statement into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  values
   * @return {string}
   */
  compileInsert (query, values) {
    // Essentially we will force every insert to be treated as a batch insert which
    // simply makes creating the SQL easier for us since we can utilize the same
    // basic routine regardless of an amount of records given to us to insert.
    const table = this.wrapTable(query.table)

    if (!Array.isArray(values)) {
      values = [values]
    }

    const columns = this.columnize(Object.keys(values[0]))

    // We need to build a list of parameter place-holders of values that are bound
    // to the query. Each insert should have the exact same amount of parameter
    // bindings so we will loop through the record and parameterize them all.
    const parameters = new Collection(values).map((record) => {
      return '(' + this.parameterize(record) + ')'
    }).implode(', ')

    return `insert into ${table} (${columns}) values ${parameters}`
  }

  /**
   * Compile an insert and get ID statement into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}   values
   * @param  {string}  sequence
   * @return {string}
   */
  compileInsertGetId (query, values, sequence) {
    return this.compileInsert(query, values)
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

  /**
   * Compile an update statement into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  values
   * @return {string}
   */
  compileUpdate (query, values) {
    const table = this.wrapTable(query.table)

    // Each one of the columns in the update statements needs to be wrapped in the
    // keyword identifiers, also a place-holder needs to be created for each of
    // the values in the list of bindings so we can make the sets statements.
    const columns = new Collection(values).map((value, key) => {
      return this.wrap(key) + ' = ' + this.parameter(value)
    }).implode(', ')

    // If the query has any "join" clauses, we will setup the joins on the builder
    // and compile them so we can attach them to this update, as update queries
    // can get join statements to attach to other tables when they're needed.
    let joins = ''

    if (query.joins.length > 0) {
      joins = ' ' + this._compileJoins(query, query.joins)
    }

    // Of course, update queries may also be constrained by where clauses so we'll
    // need to compile the where clauses and attach it to the query so only the
    // intended records are updated by the SQL statements we generate to run.
    const wheres = this._compileWheres(query)

    return `update ${table}${joins} set ${columns} ${wheres}`.trim()
  }

  /**
   * Get the grammar specific operators.
   *
   * @return {array}
   */
  getOperators () {
    return this._operators
  }

  /**
   * Prepare the bindings for an update statement.
   *
   * @param  {object}  bindings
   * @param  {array}  values
   * @return {array}
   */
  prepareBindingsForUpdate (bindings, values) {
    const bindingsWithoutJoin = Arr.except(bindings, 'join')

    return Object.values(
      Helper.merge(bindings.join, values, Arr.flatten(bindingsWithoutJoin))
    )
  }
}
