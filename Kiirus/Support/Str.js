'use strict'

const Helper = require('./Helper')

module.exports = class Str {
  /**
   * Convert a string to snake case.
   *
   * @param  {string}  value
   * @param  {string}  delimiter
   * @return {string}
   */
  static snake (value, delimiter = '_') {
    Str._snakeCache = Str._snakeCache || []

    const key = value + delimiter
    if (!Helper.empty(this._snakeCache[key])) {
      return this._snakeCache[key]
    }

    if ((value === value.toLowerCase()) === false) {
      value = value.replace(/\s+/gi, '')

      value = value.replace(/(.)(?=[A-Z])/g, '$1' + delimiter).toLowerCase()
    }

    this._snakeCache[key] = value

    return value
  }

  /**
   * Make a string's first character uppercase
   *
   * @param  {string}  value
   * @return {string}
   */
  static ucfirst (value) {
    return value.charAt(0).toUpperCase() + value.substr(1)
  }
}
