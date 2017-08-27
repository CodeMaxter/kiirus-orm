'use strict'

module.exports = class Str {
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
