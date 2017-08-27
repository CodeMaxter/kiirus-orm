module.exports = class Expression {
  /**
   * Create a new raw query expression.
   *
   * @param  {*}  value
   * @return void
   */
  constructor (value) {
    this._value = value
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
