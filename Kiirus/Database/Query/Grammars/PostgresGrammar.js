'use strict'

const Arr = require('./../../../Support/Arr')
const Collection = require('./../../../Support/Collection')
const Grammar = require('./Grammar')
const Helper = require('./../../../Support/Helper')

module.exports = class PostgresGrammar extends Grammar {
  constructor () {
    super()

    /**
     * All of the available clause operators.
     *
     * @var array
     */
    this._operators = [
      '=', '<', '>', '<=', '>=', '<>', '!=',
      'like', 'not like', 'between', 'ilike',
      '&', '|', '#', '<<', '>>',
      '@>', '<@', '?', '?|', '?&', '||', '-', '-', '#-'
    ]
  }

  /**
   * Compile a delete statement into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  compileDelete (query) {
    const table = this.wrapTable(query.from)

    return Helper.isSet(query.joins)
      ? this._compileDeleteWithJoins(query, table)
      : super.compileDelete(query)
  }

  /**
   * {@inheritdoc}
   */
  compileInsert (query, values) {
    const table = this.wrapTable(query.from)

    return Helper.empty(values)
      ? `insert into ${table} DEFAULT VALUES`
      : super.compileInsert(query, values)
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
    if (sequence === undefined) {
      sequence = 'id'
    }

    return this.compileInsert(query, values) + ' returning ' + this.wrap(sequence)
  }

  /**
   * Compile a truncate table statement into SQL.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {array}
   */
  compileTruncate (query) {
    const sql = {}

    sql['truncate ' + this.wrapTable(query.from) + ' restart identity'] = []

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
    const table = this.wrapTable(query.from)

    // Each one of the columns in the update statements needs to be wrapped in the
    // keyword identifiers, also a place-holder needs to be created for each of
    // the values in the list of bindings so we can make the sets statements.
    const columns = this.compileUpdateColumns(values)

    const from = this.compileUpdateFrom(query)

    const where = this.compileUpdateWheres(query)

    return `update ${table} set ${columns}${from} ${where}`.trim()
  }

  /**
   * Prepare the bindings for an update statement.
   *
   * @param  {array}  bindings
   * @param  {array}  values
   * @return {array}
   */
  prepareBindingsForUpdate (bindings, values) {
    // Update statements with "joins" in Postgres use an interesting syntax. We need to
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
   * Compile a date based where clause.
   *
   * @param  {string}  type
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  where
   * @return {string}
   */
  _dateBasedWhere (type, query, where) {
    const value = this.parameter(where.value)

    return `extract(${type} from ${this.wrap(where.column)}) ${where.operator} ${value}`
  }

  /**
   * Compile a delete query that uses joins.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {string}  table
   * @param  {array}  where
   * @return {string}
   */
  _compileDeleteWithJoins (query, table) {
    const using = ' USING ' + new Collection(query.joins).map((join) => {
      return this.wrapTable(join.table)
    }).join(', ')

    const where = query.wheres.length > 0 ? ' ' + this._compileUpdateWheres(query) : ''

    return `delete from ${table}${using}${where}`.trim()
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
      return value ? 'for update' : 'for share'
    }

    return value
  }

  /**
   * Compile the columns for the update statement.
   *
   * @param  {array}   values
   * @return {string}
   */
  _compileUpdateColumns (values) {
    // When gathering the columns for an update statement, we'll wrap each of the
    // columns and convert it to a parameter value. Then we will concatenate a
    // list of the columns that can be added into this update query clauses.
    return new Collection(values).map((value, key) => {
      return this.wrap(key) + ' = ' + this.parameter(value)
    }).join(', ')
  }

  /**
   * Compile the "from" clause for an update with a join.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string|undefined}
   */
  _compileUpdateFrom (query) {
    if (!Helper.isSet(query.joins)) {
      return ''
    }

    // When using Postgres, updates with joins list the joined tables in the from
    // clause, which is different than other systems like MySQL. Here, we will
    // compile out the tables that are joined and add them to a from clause.
    const froms = new Collection(query.joins).map((join) => {
      return this.wrapTable(join.table)
    }).all()

    if (froms.length > 0) {
      return ' from ' + froms.join(', ')
    }
  }

  /**
   * Compile the "join" clause where clauses for an update.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  _compileUpdateJoinWheres (query) {
    const joinWheres = []

    // Here we will just loop through all of the join constraints and compile them
    // all out then implode them. This should give us "where" like syntax after
    // everything has been built and then we will join it to the real wheres.
    for (let join of query.joins) {
      for (let where of join.wheres) {
        const method = `where${where.type}`

        joinWheres.push(where.boolean + ' ' + this[method](query, where))
      }
    }

    return joinWheres.join(' ')
  }

  /**
   * Compile the additional where clauses for updates with joins.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @return {string}
   */
  _compileUpdateWheres (query) {
    const baseWheres = this.compileWheres(query)

    if (!Helper.isSet(query.joins)) {
      return baseWheres
    }

    // Once we compile the join constraints, we will either use them as the where
    // clause or append them to the existing base where clauses. If we need to
    // strip the leading boolean we will do so when using as the only where.
    const joinWheres = this._compileUpdateJoinWheres(query)

    if (baseWheres.trim() === '') {
      return 'where ' + this._removeLeadingBoolean(joinWheres)
    }

    return baseWheres + ' ' + joinWheres
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

    return this.wrap(where.column) + '::date ' + where.operator + ' ' + value
  }

  /**
   * Wrap the attributes of the give JSON path.
   *
   * @param  {array}  path
   * @return {array}
   */
  _wrapJsonPathAttributes (path) {
    return path.map((attribute) => {
      return `'attribute'`
    })
  }

  /**
   * Wrap the given JSON selector.
   *
   * @param  {string}  value
   * @return {string}
   */
  _wrapJsonSelector (value) {
    const path = value.split('.')

    const field = this.wrapValue(path.shift())

    const wrappedPath = this.wrapJsonPathAttributes(path)

    const attribute = wrappedPath.pop()

    if (!Helper.empty(wrappedPath)) {
      return field + '.' + wrappedPath.join('.') + '.' + attribute
    }

    return field + '.' + attribute
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
    if (value.includes('.')) {
      return this.wrapJsonSelector(value)
    }

    return '"' + value.replace(/"/gi, '""') + '"'
  }
}
