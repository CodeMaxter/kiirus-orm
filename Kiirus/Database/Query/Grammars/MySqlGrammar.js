'use strict'

const Grammar = require('./Grammar')

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
   * Wrap a single string in keyword identifiers.
   *
   * @param  {string}  value
   * @return {string}
   */
  _wrapValue (value) {
    if (value === '*') {
      return value
    }

    return '`' + value.replace('`', '``') + '`'
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
}
