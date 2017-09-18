'use strict'

const Helper = require('./Helper')

module.exports = class Arr {
  /**
   * Explode the "value" and "key" arguments passed to "pluck".
   *
   * @param  {string|array}  value
   * @param  {string|array|undefined}  key
   * @return {array}
   */
  static _explodePluckParameters (value, key) {
    value = Array.isArray(value) ? value : value.split('.')

    key = key === undefined || Array.isArray(key) ? key : key.split('.')

    return [value, key]
  }

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
   * Return the first element in an array passing a given truth test.
   *
   * @param  {array}  array
   * @param  {function|undefined}  callback
   * @param  {*}  defaultValue
   * @return {*}
   */
  static first (array, callback = undefined, defaultValue = undefined) {
    if (callback === undefined) {
      if (Helper.empty(array)) {
        return Helper.value(defaultValue)
      }

      for (let item of array) {
        return item
      }
    }

    for (const [key, value] of array.entries()) {
      if (callback(value, key)) {
        return value
      }
    }

    return Helper.value(defaultValue)
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
   * Pluck an array of values from an array.
   *
   * @param  {array}   array
   * @param  {string|array}  value
   * @param  {string|array|undefined}  key
   * @return {array}
   */
  static pluck (array, value, key = undefined) {
    [value, key] = Arr._explodePluckParameters(value, key)

    let results = []
    let objectResult = {}

    for (let index = 0, length = array.length; index < length; ++index) {
      const itemValue = Helper.dataGet(array[index], value)

      // If the key is "undefined", we will just append the value to the array and keep
      // looping. Otherwise we will key the array using the value of the key we
      // received from the developer. Then we'll return the final array form.
      if (key === undefined) {
        results.push(itemValue)
      } else {
        const itemKey = Helper.dataGet(array[index], key)

        results[itemKey] = itemValue
      }
    }

    if (Object.keys(results).length !== results.length) {
      for (let key in results) {
        objectResult[key] = results[key]
      }

      results = objectResult
    }

    return results
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
