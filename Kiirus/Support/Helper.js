'use strict'

const HigherOrderTapProxy = require('./HigherOrderTapProxy')

module.exports = class Helper {
  /**
   * Clone a object
   *
   * @param {object} value
   * @returns {*}
   */
  static clone (value) {
    let copy = Object.create(Object.getPrototypeOf(value))
    // let copy = Object.assign({}, value)

    // Object.setPrototypeOf(copy, Object.getPrototypeOf(value))

    Object.getOwnPropertyNames(value).forEach(propName => {
      Object.defineProperty(copy, propName, Object.getOwnPropertyDescriptor(value, propName))
    })

    return copy
  }

  /**
   * Determine whether a variable is empty
   *
   * @param {*} data
   * @returns {boolean}
   */
  static empty (data) {
    if (undefined === data || data === null || data === '' ||
      Boolean(data) === false || data.length === 0
    ) {
      return true
    }

    return false
  }

  /**
   * Determines whether its argument is a number.
   *
   * @param  {*}   value
   * @returns {boolean}
   */
  static isNumeric (value) {
    return !Array.isArray(value) && (value - parseFloat(value) + 1) >= 0
  }

  /**
   * Check if a value is a real Object
   *
   * @param {*} value
   * @return {boolean}
   */
  static isObject (value) {
    return Object.prototype.toString.call(value) === '[object Object]'
  }

  /**
   * Check if a value is set
   *
   * @param {*} value
   * @return {boolean}
   */
  static isSet (value) {
    return (value !== undefined && value !== null)
  }

  /**
   * Check if a value is a real String
   * @param {*} value
   * @return {boolean}
   */
  static isString (value) {
    return Object.prototype.toString.call(value) === '[object String]'
  }

  /**
   * Determine if the given key exists in the provided object.
   *
   * @param  {object}  array
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
   * Merge one or more arrays
   *
   * @param {array...}
   * @return {object}
   */
  static merge () {
    //  discuss at: http://locutus.io/php/array_merge/
    // original by: Brett Zamir (http://brett-zamir.me)
    // bugfixed by: Nate
    // bugfixed by: Brett Zamir (http://brett-zamir.me)
    //    input by: josh
    //   example 1: var $arr1 = {"color": "red", 0: 2, 1: 4}
    //   example 1: var $arr2 = {0: "a", 1: "b", "color": "green", "shape": "trapezoid", 2: 4}
    //   example 1: array_merge($arr1, $arr2)
    //   returns 1: {"color": "green", 0: 2, 1: 4, 2: "a", 3: "b", "shape": "trapezoid", 4: 4}
    //   example 2: var $arr1 = []
    //   example 2: var $arr2 = {1: "data"}
    //   example 2: array_merge($arr1, $arr2)
    //   returns 2: {0: "data"}

    var args = Array.from(arguments)
    var argl = args.length
    var arg
    var retObj = {}
    var k = ''
    var argil = 0
    var j = 0
    var i = 0
    var ct = 0
    var toStr = Object.prototype.toString
    var retArr = true

    for (i = 0; i < argl; i++) {
      if (toStr.call(args[i]) !== '[object Array]') {
        retArr = false
        break
      }
    }

    if (retArr) {
      retArr = []
      for (i = 0; i < argl; i++) {
        retArr = retArr.concat(args[i])
      }
      return retArr
    }

    for (i = 0, ct = 0; i < argl; i++) {
      arg = args[i]
      if (toStr.call(arg) === '[object Array]') {
        for (j = 0, argil = arg.length; j < argil; j++) {
          retObj[ct++] = arg[j]
        }
      } else {
        for (k in arg) {
          if (arg.hasOwnProperty(k)) {
            if (parseInt(k, 10) + '' === k) {
              retObj[ct++] = arg[k]
            } else {
              retObj[k] = arg[k]
            }
          }
        }
      }
    }

    return retObj
  }

  /**
   * Call the given Closure with the given value then return the value.
   *
   * @param  {*}  value
   * @param  {function|undefined}  callback
   * @return {*}
   */
  static tap (value, callback = undefined) {
    if (callback === undefined) {
      return new HigherOrderTapProxy(value)
    }

    callback(value)

    return value
  }
}
