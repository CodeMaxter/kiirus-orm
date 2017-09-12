'use strict'

const Helper = require('./Helper')

module.exports = class Arr {
  /**
   * Get all of the given array except for a specified array of items.
   *
   * @param  {array}  array
   * @param  {array|string}  keys
   * @return {array}
   */
  static except (array, keys) {
    this.forget(array, keys)

    return array
  }

  /**
   * Determine if the given key exists in the provided array.
   *
   * @param  {array}  haystack
   * @param  {string|number}  key
   * @return {boolean}
   */
  static exists (haystack, key) {
    return Arr.keyExists(key, haystack)
  }

  /**
   * Flatten a multi-dimensional array into a single level.
   *
   * @param  {array}  array
   * @return {array}
   */
  static flatten (array) {
    const results = []

    const arrayFlatten = (items) => {
      for (let key in items) {
        if (items[key] !== null && typeof items[key] === 'object') {
          arrayFlatten(items[key])
        } else {
          results.push(items[key])
        }
      }
    }

    arrayFlatten(array)

    return results
  }

  /**
   * Remove one or many array items from a given array using "dot" notation.
   *
   * @param  {array}  array
   * @param  {array|string}  keys
   * @return {void}
   */
  static forget (array, keys) {
    const original = Helper.clone(array)

    if (Helper.isSet(keys) === false) {
      keys = []
    } else if (this.isAssoc(keys)) {
      keys = Array.from(keys)
    } else if (Array.isArray(keys) === false) {
      keys = [keys]
    }

    if (keys.length === 0) {
      return
    }

    keys.forEach(key => {
      // if the exact key exists in the top-level, remove it
      if (Arr.exists(array, key)) {
        Arr.unSet(array, key)

        return
      }

      let parts = key.split('.')

      // clean up before each pass
      array = Helper.clone(original)

      while (parts.length > 1) {
        const part = parts.shift()

        if (Helper.isSet(array[part]) && Array.isArray(array[part])) {
          array = array[part]
        } else {
          continue
        }
      }

      delete array[parts.shift()]
    })
  }

  /**
   * Determines if an array is associative.
   *
   * An array is "associative" if it doesn't have sequential numerical keys beginning with zero.
   *
   * @param  {array}  array
   * @return {boolean}
   */
  static isAssoc (array) {
    return Helper.isObject(array)
  }
  /**
   * Determine if the given key exists in the provided array.
   *
   * @param  {array}  array
   * @param  {string|int}  key
   * @return {boolean}
   */
  static keyExists (key, haystack) {
    if (!haystack || (Array.isArray(haystack) === false &&
      haystack.constructor !== Object)) {
      return false
    }

    if (haystack[key] !== undefined) {
      return true
    }

    if (String(key).indexOf('.') !== -1) {
      let parts = String(key).split('.')

      while (parts.length > 0) {
        key = parts.shift()

        if (undefined !== haystack[key]) {
          haystack = haystack[key]
        } else {
          return false
        }
      }

      return true
    } else {
      for (let index in haystack) {
        if (Helper.isSet(haystack[index]) === true &&
          haystack[index][key] !== undefined
        ) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Unset a given key on the input
   *
   * @param {array} input
   * @param {string} key
   * @return {array}
   */
  static unSet (input, key) {
    const parts = key.split('.')

    if (key in input) {
      delete input[key]
    }

    while (parts.length > 1) {
      key = parts.shift()

      if (undefined !== input[key]) {
        input = input[key]
      }
    }

    delete input[parts.shift()]
  }

  /**
   * Filter the array using the given callback.
   *
   * @param  {array}  value
   * @param  {function}  callback
   * @return {array}
   */
  static where (value, callback) {
    if (Array.isArray(value)) {
      return value.filter(callback)
    }

    return Object.keys(value)
      .filter(key => {
        const item = {[key]: value[key]}

        return callback(item, key)
      })
      .reduce((res, key) => {
        res[key] = value[key]

        return res
      }, {})
  }

  /**
   * If the given value is not an array, wrap it in one.
   *
   * @param  {*}  value
   * @return {array}
   */
  static wrap (value) {
    return !Array.isArray(value) ? [value] : value
  }
}
