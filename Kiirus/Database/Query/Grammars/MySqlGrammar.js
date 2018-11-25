'use strict'

const Collection = require('./../../../Support/Collection')
const Grammar = require('./Grammar')
const Helper = require('./../../../Support/Helper')
const JsonExpression = require('./../JsonExpression')

module.exports = class MySqlGrammar extends Grammar {
  constructor () {
    super()

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
      : this._compileDeleteWithoutJoins(query, table, where)
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

    let parameters

    if (!Array.isArray(values)) {
      values = [values]
    }

    const columns = this.columnize(Object.keys(values[0]))

    // if (values.length > 1) {
    parameters = '?'
    // } else {
    //   // We need to build a list of parameter place-holders of values that are bound
    //   // to the query. Each insert should have the exact same amount of parameter
    //   // bindings so we will loop through the record and parameterize them all.
    //   parameters = new Collection(values).map((record) => {
    //     return '(' + this.parameterize(record) + ')'
    //   }).implode(', ')
    // }

    return `insert into ${table} (${columns}) values ${parameters}`
  }

  /**
   * Compile the random statement into SQL.
   *
   * @param  {string}  seed
   * @return {string}
   */
  compileRandom (seed) {
    return `RAND(${seed})`
  }

  /**
   * Compile a select query into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  compileSelect (query) {
    let sql = super.compileSelect(query)

    if (query.unions.length > 0) {
      sql = '(' + sql + ') ' + this._compileUnions(query)
    }

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
    const columns = this._compileUpdateColumns(values)

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
    const where = this._compileWheres(query)

    let sql = `update ${table}${joins} set ${columns} ${where}`.trimRight()

    // If the query has an order by clause we will compile it since MySQL supports
    // order bys on update statements. We'll compile them using the typical way
    // of compiling order bys. Then they will be appended to the SQL queries.
    if (query.orders.length > 0) {
      sql += ' ' + this._compileOrders(query, query.orders)
    }

    // Updates on MySQL also supports "limits", which allow you to easily update a
    // single record very easily. This is not supported by all database engines
    // so we have customized this update compiler here in order to add it in.
    if (Helper.isSet(query.limitProperty)) {
      sql += ' ' + this._compileLimit(query, query.limitProperty)
    }

    return sql.trimRight()
  }

  /**
   * Prepare the bindings for an update statement.
   *
   * Booleans, integers, and doubles are inserted into JSON updates as raw values.
   *
   * @param  {array}  bindings
   * @param  {array}  values
   * @return {array}
   */
  prepareBindingsForUpdate (bindings, values) {
    values = new Collection(values).reject((value, column) => {
      return this._isJsonSelector(column) &&
      ['boolean', 'number'].includes(typeof value)
    }).all()

    return super.prepareBindingsForUpdate(bindings, values)
  }

  /**
   * Compile a delete query that uses joins.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {string}  table
   * @param  {array}  where
   * @return {string}
   */
  _compileDeleteWithJoins (query, table, where) {
    const joins = ' ' + this._compileJoins(query, query.joins)

    const alias = table.toLowerCase().includes(' as ') !== false
      ? table.split(' as ')[1] : table

    return `delete ${alias} from ${table}${joins} ${where}`.trim()
  }

  /**
   * Compile a delete query that does not use joins.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {string}  table
   * @param  {array}  where
   * @return {string}
   */
  _compileDeleteWithoutJoins (query, table, where) {
    let sql = `delete from ${table} ${where}`.trim()

    // When using MySQL, delete statements may contain order by statements and limits
    // so we will compile both of those here. Once we have finished compiling this
    // we will return the completed SQL statement so it will be executed for us.
    if (query.orders.length > 0) {
      sql += ' ' + this._compileOrders(query, query.orders)
    }

    if (Helper.isSet(query.limitProperty)) {
      sql += ' ' + this._compileLimit(query, query.limitProperty)
    }

    return sql
  }

  /**
   * Prepares a JSON column being updated using the JSON_SET function.
   *
   * @param  {string}  key
   * @param  {\Kiirus\Database\Query\JsonExpression}  value
   * @return {string}
   */
  _compileJsonUpdateColumn (key, value) {
    const path = key.split('->')

    const field = this._wrapValue(path.shift())

    const accessor = '"$.' + path.join('.') + '"'

    return `${field} = json_set(${field}, ${accessor}, ${value.getValue()})`
  }

  /**
   * Compile the lock into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {boolean|string}  value
   * @return {string}
   */
  _compileLock (query, value) {
    if (!Helper.isString(value)) {
      return value ? 'for update' : 'lock in share mode'
    }

    return value
  }

  /**
   * Compile a single union statement.
   *
   * @param  {array}  union
   * @return {string}
   */
  _compileUnion (union) {
    const conjuction = union['all'] ? ' union all ' : ' union '

    return conjuction + '(' + union.query.toSql() + ')'
  }

  /**
   * Compile all of the columns for an update statement.
   *
   * @param  {array}  values
   * @return {string}
   */
  _compileUpdateColumns (values) {
    return new Collection(values).map((value, key) => {
      if (this._isJsonSelector(key)) {
        return this._compileJsonUpdateColumn(key, new JsonExpression(value))
      } else {
        return this.wrap(key) + ' = ' + this.parameter(value)
      }
    }).implode(', ')
  }

  /**
   * Determine if the given string is a JSON selector.
   *
   * @param  {string}  value
   * @return {boolean}
   */
  _isJsonSelector (value) {
    return value.includes('->')
  }

  /**
   * Wrap the given JSON selector.
   *
   * @param  {string}  value
   * @return {string}
   */
  _wrapJsonSelector (value) {
    const path = value.split('->')

    const field = this._wrapValue(path.shift())

    // return `${field}$.'${new Collection(path).map((part) => {
    //   return '"' + part + '"'
    // }).implode('.')}'`

    return `${field}->'$.${new Collection(path).map((part) => {
      return '"' + part + '"'
    }).implode('.')}'`
  }

  /**
   * Wrap a single string in keyword identifiers.
   *
   * @param  {string}  value
   * @return {string}
   */
  _wrapValue (value) {
    if (value === '*') {
      return value
    }

    // If the given value is a JSON selector we will wrap it differently than a
    // traditional value. We will need to split this path and wrap each part
    // wrapped, etc. Otherwise, we will simply wrap the value as a string.
    if (this._isJsonSelector(value)) {
      return this._wrapJsonSelector(value)
    }

    return '`' + value.replace('`', '``') + '`'
  }
}
