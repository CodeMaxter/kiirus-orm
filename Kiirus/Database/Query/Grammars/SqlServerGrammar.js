'use strict'

const Arr = require('./../../../Support/Arr')
const Collection = require('./../../../Support/Collection')
const Grammar = require('./Grammar')
const Helper = require('./../../../Support/Helper')

module.exports = class SqlServerGrammar extends Grammar {
  constructor () {
    super()

    /**
     * The components that make up a select clause.
     *
     * @var {array}
     */
    this._operators = [
      '=', '<', '>', '<=', '>=', '!<', '!>', '<>', '!=',
      'like', 'not like', 'between', 'ilike',
      '&', '&=', '|', '|=', '^', '^='
    ]
  }

  /**
   * Compile a delete statement into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  compileDelete (query) {
    const table = this.wrapTable(query.table)

    const where = Array.isArray(query.wheres) ? this._compileWheres(query) : ''

    return query.joins.length > 0
      ? this._compileDeleteWithJoins(query, table, where)
      : `delete from ${table} ${where}`.trim()
  }

  /**
   * Compile an exists statement into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  compileExists (query) {
    const existsQuery = Helper.clone(query)

    existsQuery.columns = []

    return this.compileSelect(existsQuery.selectRaw('1 [exists]').limit(1))
  }

  /**
   * Compile the random statement into SQL.
   *
   * @param  {string}  seed
   * @return {string}
   */
  compileRandom (seed) {
    return 'NEWID()'
  }

  /**
   * Compile the SQL statement to define a savepoint.
   *
   * @param  {string}  name
   * @return {string}
   */
  compileSavepoint (name) {
    return 'SAVE TRANSACTION ' + name
  }

  /**
   * Compile the SQL statement to execute a savepoint rollback.
   *
   * @param  {string}  name
   * @return {string}
   */
  compileSavepointRollBack (name) {
    return 'ROLLBACK TRANSACTION ' + name
  }

  /**
   * Compile a select query into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  compileSelect (query) {
    if (!query.offsetProperty) {
      return super.compileSelect(query)
    }

    // If an offset is present on the query, we will need to wrap the query in
    // a big "ANSI" offset syntax block. This is very nasty compared to the
    // other database systems but is necessary for implementing features.
    if (query.columns.length === 0) {
      query.columns = ['*']
    }

    return this._compileAnsiOffset(
      query, this._compileComponents(query)
    )
  }

  /**
   * Compile a truncate table statement into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {array}
   */
  compileTruncate (query) {
    const sql = {}

    sql['truncate table ' + this.wrapTable(query.table)] = []

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
    const [table, alias] = this._parseUpdateTable(query.table)

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

    if (Helper.isSet(query.joins)) {
      joins = ' ' + this._compileJoins(query, query.joins)
    }

    // Of course, update queries may also be constrained by where clauses so we'll
    // need to compile the where clauses and attach it to the query so only the
    // intended records are updated by the SQL statements we generate to run.
    const where = this._compileWheres(query)

    if (!Helper.empty(joins)) {
      return `update ${alias} set ${columns} from ${table}${joins} ${where}`.trim()
    }

    return `update ${table}${joins} set $columns $where`.trim()
  }

  /**
   * Get the format for database stored dates.
   *
   * @return {string}
   */
  getDateFormat () {
    return 'Y-m-d H:i:s.000'
  }

  /**
   * Prepare the bindings for an update statement.
   *
   * @param  {array}  bindings
   * @param  {array}  values
   * @return {array}
   */
  prepareBindingsForUpdate (bindings, values) {
    // Update statements with joins in SQL Servers utilize an unique syntax. We need to
    // take all of the bindings and put them on the end of this array since they are
    // added to the end of the "where" clause statements as typical where clauses.
    const bindingsWithoutJoin = Arr.except(Object.assign({}, bindings), 'join')

    return [].concat(
      Object.values(values),
      bindings.join,
      Arr.flatten(bindingsWithoutJoin)
    ).filter((binding) => binding !== undefined)
  }

  /**
   * Determine if the grammar supports savepoints.
   *
   * @return {boolean}
   */
  supportsSavepoints () {
    return true
  }

  /**
   * Wrap a table in keyword identifiers.
   *
   * @param  {\Kiirus\Database\Query\Expression|string}  table
   * @return {string}
   */
  wrapTable (table) {
    return this._wrapTableValuedFunction(super.wrapTable(table))
  }

  /**
   * Create a full ANSI offset clause for the query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  components
   * @return {string}
   */
  _compileAnsiOffset (query, components) {
    // An ORDER BY clause is required to make this offset query work, so if one does
    // not exist we'll just create a dummy clause to trick the database and so it
    // does not complain about the queries for not having an "order by" clause.
    if (Helper.empty(components.orders)) {
      components.orders = 'order by (select 0)'
    }

    // We need to add the row number to the query so we can compare it to the offset
    // and limit values given for the statements. So we will add an expression to
    // the "select" that will give back the row numbers on each of the records.
    components.columns += this._compileOver(components.orders)

    delete components.orders

    // Next we need to calculate the constraints that should be placed on the query
    // to get the right offset and limit from our query but if there is no limit
    // set we will just handle the offset only since that is all that matters.
    const sql = this._concatenate(components)

    return this._compileTableExpression(sql, query)
  }

  /**
   * Compile the "select *" portion of the query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  columns
   * @return {string|null}
   */
  _compileColumns (query, columns) {
    if (query.aggregateProperty !== undefined) {
      return
    }

    let select = query.distinctProperty ? 'select distinct ' : 'select '

    // If there is a limit on the query, but not an offset, we will add the top
    // clause to the query, which serves as a "limit" type clause within the
    // SQL Server system similar to the limit keywords available in MySQL.
    if (query.limitProperty > 0 && (query.offsetProperty === undefined ||
      query.offsetProperty <= 0)
    ) {
      select += 'top ' + query.limitProperty + ' '
    }

    return select + this.columnize(columns)
  }

  /**
   * Compile a delete statement with joins into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {string}  table
   * @param  {string}  where
   * @return {string}
   */
  _compileDeleteWithJoins (query, table, where) {
    const joins = ' ' + this._compileJoins(query, query.joins)

    const alias = table.toLowerCase().includes(' as ') !== false
      ? table.split(' as ')[1] : table

    return `delete ${alias} from ${table}${joins} ${where}`.trim()
  }

  /**
   * Compile the "from" portion of the query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {string}  table
   * @return {string}
   */
  _compileFrom (query, table) {
    let from = super._compileFrom(query, table)

    if (Helper.isString(query.lockProperty)) {
      return from + ' ' + query.lockProperty
    }

    if (query.lockProperty !== undefined) {
      return from + ' with(rowlock,' + (query.lockProperty ? 'updlock,' : '') + 'holdlock)'
    }

    return from
  }

  /**
   * Compile the "limit" portions of the query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {number}  limit
   * @return {string}
   */
  _compileLimit (query, limit) {
    return ''
  }

  /**
   * Compile the lock into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {boolean|string}  value
   * @return {string}
   */
  _compileLock (query, value) {
    return ''
  }

  /**
   * Compile the "offset" portions of the query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {number}  offset
   * @return {string}
   */
  _compileOffset (query, offset) {
    return ''
  }

  /**
   * Compile the over statement for a table expression.
   *
   * @param  {string}  orderings
   * @return {string}
   */
  _compileOver (orderings) {
    return `, row_number() over (${orderings}) as row_num`
  }

  /**
   * Compile the limit / offset row constraint for a query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  _compileRowConstraint (query) {
    const start = query.offsetProperty + 1

    if (query.limitProperty > 0) {
      const finish = query.offsetProperty + query.limitProperty

      return `between ${start} and ${finish}`
    }

    return `>= ${start}`
  }

  /**
   * Compile a common table expression for a query.
   *
   * @param  {string}  sql
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  _compileTableExpression (sql, query) {
    const constraint = this._compileRowConstraint(query)

    return `select * from (${sql}) as temp_table where row_num ${constraint}`
  }

  /**
   * Get the table and alias for the given table.
   *
   * @param  {string}  table
   * @return {array}
   */
  _parseUpdateTable (table) {
    let alias

    table = alias = this.wrapTable(table)

    if (table.toLowerCase().includes('] as [') !== false) {
      alias = '[' + table.split('] as [')[1]
    }

    return [table, alias]
  }

  /**
   * Compile a "where date" clause.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _whereDate (query, where) {
    const value = this.parameter(where['value'])

    return 'cast(' + this.wrap(where.column) + ' as date) ' + where.operator + ' ' + value
  }

  /**
   * Wrap a single string in keyword identifiers.
   *
   * @param  {string}  value
   * @return {string}
   */
  _wrapValue (value) {
    return value === '*' ? value : '[' + value.replace(/]/gi, ']]') + ']'
  }

  /**
   * Wrap a table in keyword identifiers.
   *
   * @param  {string}  table
   * @return {string}
   */
  _wrapTableValuedFunction (table) {
    const matches = table.match(/^(.+?)(\(.*?\))]$/)

    if (matches !== null) {
      table = matches[1] + ']' + matches[2]
    }

    return table
  }
}
