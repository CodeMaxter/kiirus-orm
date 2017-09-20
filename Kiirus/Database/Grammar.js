'use strict'

const Expression = require('./Query/Expression')

module.exports = class Grammar {
  constructor () {
    /**
     * The grammar table prefix.
     *
     * @var {string}
     */
    this._tablePrefix = ''
  }

  /**
   * Wrap a value that has an alias.
   *
   * @param  {string}  value
   * @param  {boolean}  prefixAlias
   * @return {string}
   */
  _wrapAliasedValue (value, prefixAlias = false) {
    const segments = value.split(/\s+as\s+/i)

    // If we are wrapping a table we need to prefix the alias with the table prefix
    // as well in order to generate proper syntax. If this is a column of course no
    // prefix is necessary. The condition will be true when from wrapTable.
    if (prefixAlias) {
      segments[1] = this._tablePrefix + segments[1]
    }

    return this.wrap(segments[0]) + ' as ' + this._wrapValue(segments[1])
  }

  /**
   * Wrap the given value segments.
   *
   * @param  {array}  segments
   * @return {string}
   */
  _wrapSegments (segments) {
    return segments.map((segment, key) => {
      return key === 0 && segments.length > 1
        ? this.wrapTable(segment)
        : this._wrapValue(segment)
    }).join('.')
  }

  /**
   * Wrap a single string in keyword identifiers.
   *
   * @param  {string}  value
   * @return {string}
   */
  _wrapValue (value) {
    if (value !== '*') {
      return '"' + value.replace('"', '""') + '"'
    }

    return value
  }

  /**
   * Convert an array of column names into a delimited string.
   *
   * @param  {array}   columns
   * @return {string}
   */
  columnize (columns) {
    return columns.map((column) => {
      return this.wrap(column)
    }).join(', ')
  }

  /**
   * Get the value of a raw expression.
   *
   * @param  {\Kiirus\Database\Query\Expression}  expression
   * @return {string}
   */
  getValue (expression) {
    return expression.getValue()
  }

  /**
   * Determine if the given value is a raw expression.
   *
   * @param  {*}  value
   * @return {boolean}
   */
  isExpression (value) {
    return value instanceof Expression
  }

  /**
   * Get the appropriate query parameter place-holder for a value.
   *
   * @param  {*}   value
   * @return {string}
   */
  parameter (value) {
    return this.isExpression(value) ? this.getValue(value) : '?'
  }

  /**
   * Create query parameter place-holders for an array.
   *
   * @param  {array}   values
   * @return {string}
   */
  parameterize (values) {
    // return values.map(this.parameter.bind(this)).join(', ')

    const result = []

    for (const key in values) {
      result.push(this.parameter(values[key]))
    }

    return result.join(', ')
  }

  /**
   * Set the grammar's table prefix.
   *
   * @param  {string}  prefix
   * @return {this}
   */
  setTablePrefix (prefix) {
    this._tablePrefix = prefix

    return this
  }

  /**
   * Wrap a value in keyword identifiers.
   *
   * @param  {string}  value
   * @param  {boolean} prefixAlias
   * @return {string}
   */
  wrap (value, prefixAlias = false) {
    if (this.isExpression(value)) {
      return this.getValue(value)
    }

    // If the value being wrapped has a column alias we will need to separate out
    // the pieces so we can wrap each of the segments of the expression on it
    // own, and then joins them both back together with the "as" connector.
    if (value.toLowerCase().indexOf(' as ') !== -1) {
      return this._wrapAliasedValue(value, prefixAlias)
    }

    return this._wrapSegments(value.split('.'))
  }

  /**
   * Wrap a table in keyword identifiers.
   *
   * @param  {string}  table
   * @return {string}
   */
  wrapTable (table) {
    if (!this.isExpression(table)) {
      return this.wrap(this._tablePrefix + table, true)
    }

    return this.getValue(table)
  }
}
