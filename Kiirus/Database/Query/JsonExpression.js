'use strict'

const Expression = require('./Expression')

module.exports = class JsonExpression extends Expression {
  /**
   * Create a new raw query expression.
   *
   * @param  {*}  value
   * @return {void}
   */
  constructor (value) {
    super()

    /**
     * The value of the expression.
     *
     * @var {*}
     */
    this._value = this._getJsonBindingParameter(value)
  }

  /**
   * Translate the given value into the appropriate JSON binding parameter.
   *
   * @param  {*}  value
   * @return {string}
   */
  _getJsonBindingParameter (value) {
    const type = typeof value

    switch (type) {
      case 'boolean':
        return value ? 'true' : 'false'
      case 'number':
        return value
      case 'string':
        return '?'
      case 'object':
      case 'array':
        return '?'
    }

    throw new Error('JSON value is of illegal type: ' + type)
  }

  /**
   * Get the value of the expression.
   *
   * @return {*}
   */
  getValue () {
    return this._value
  }

  /**
   * Get the value of the expression.
   *
   * @return {string}
   */
  toString () {
    return String(this.getValue())
  }
}
