'use strict'

module.exports = class Arr {
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
}
