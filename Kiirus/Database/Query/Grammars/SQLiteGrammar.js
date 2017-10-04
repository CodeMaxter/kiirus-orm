'use strict'

const Grammar = require('./Grammar')
const Helper = require('./../../../Support/Helper')

module.exports = class SQLiteGrammar extends Grammar {
  constructor () {
    super()

    /**
     * All of the available clause operators.
     *
     * @var {array}
     */
    this._operators = [
      '=', '<', '>', '<=', '>=', '<>', '!=',
      'like', 'not like', 'between', 'ilike',
      '&', '|', '<<', '>>'
    ]

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
      {name: 'lock', translated: 'lockProperty'}
    ]
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

    // if (!Array.isArray(values[0])) {
    if (!Array.isArray(values)) {
      values = [values]
    }

    // If there is only one record being inserted, we will just use the usual query
    // grammar insert builder because no special syntax is needed for the single
    // row inserts in SQLite. However, if there are multiples, we'll continue.
    if (values.length === 1) {
      return Helper.empty(values[0])
        ? `insert into ${table} default values`
        : super.compileInsert(query, values[0])
    }

    const names = this.columnize(Object.keys(values[0]))

    let columns = []

    // SQLite requires us to build the multi-row insert as a listing of select with
    // unions joining them together. So we'll build out this list of columns and
    // then join them all together with select unions to complete the queries.
    for (let column of Object.keys(values[0])) {
      columns.push('? as ' + this.wrap(column))
    }

    columns = new Array(values.length).fill(columns.join(', '), 0)

    return `insert into ${table} (${names}) select ` + columns.join(' union all select ')
  }

  /**
   * Compile a select query into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  compileSelect (query) {
    let sql = super.compileSelect(query)

    if (Object.keys(query.unions).length > 0) {
      sql = 'select * from (' + sql + ') ' + this._compileUnions(query)
    }

    return sql
  }

  /**
   * Compile a truncate table statement into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  $query
   * @return array
   */
  compileTruncate (query) {
    const sql = {}

    sql['delete from sqlite_sequence where name = ?'] = [query.from]
    sql['delete from ' + this.wrapTable(query.from)] = []

    return sql
  }

  /**
   * Compile a single union statement.
   *
   * @param  {array}  union
   * @return {string}
   */
  _compileUnion (union) {
    const conjuction = union['all'] ? ' union all ' : ' union '

    return conjuction + 'select * from (' + union.query.toSql() + ')'
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
    let value = String(where.value).padStart(2, '0')

    value = this.parameter(value)

    return `strftime('${type}', ${this.wrap(where.column)}) ${where.operator} ${value}`
  }

  /**
   * Compile a "where date" clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereDate (query, where) {
    return this._dateBasedWhere('%Y-%m-%d', query, where)
  }

  /**
   * Compile a "where day" clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereDay (query, where) {
    return this._dateBasedWhere('%d', query, where)
  }

  /**
   * Compile a "where month" clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereMonth (query, where) {
    return this._dateBasedWhere('%m', query, where)
  }

  /**
   * Compile a "where year" clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereYear (query, where) {
    return this._dateBasedWhere('%Y', query, where)
  }
}
