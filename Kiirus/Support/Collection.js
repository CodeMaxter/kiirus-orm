'use strict'

const Arr = require('./Arr')
const Helper = require('./Helper')

module.exports = class Collection {
  /**
   * Create a new collection.
   *
   * @param  {*}  items
   * @return {void}
   */
  constructor (items = []) {
    /**
     * The items contained in the collection.
     *
     * @var {array}
     */
    this._items = Array.isArray(items) ? items : this.valueOf(items)

    this.length = this._items.length
  }

  /**
   * Iterator to deal with the collection like a array
   */
  [Symbol.iterator] () {
    let index = -1
    let data = this._items

    return {
      next: () => ({ value: data[++index], done: !(index in data) })
    }
  }

  /**
   * Determine if the given value is callable, but not a string.
   *
   * @param  {*}  value
   * @return {boolean}
   */
  _useAsCallable (value) {
    return !Helper.isString(value) && typeof value === 'function'
  }

  /**
   * Get all of the items in the collection.
   *
   * @return {array}
   */
  all () {
    return this._items
  }

  /**
   * Run a filter over each of the items.
   *
   * @param  {function|undefined}  $callback
   * @return {\Kiirus\Support\Collection}
   */
  filter (callback = null) {
    if (callback) {
      return new this.constructor(Arr.where(this._items, callback))
    }

    return new this.constructor(this._items.filter((item) => item !== ''))
  }

  /**
   * Run a map over each of the items.
   *
   * @param  {function}  callback
   * @return {Collection}
   */
  map (callback) {
    const items = []

    for (let key in this._items) {
      items.push(callback(this._items[key], key))
    }

    return new this.constructor(items)
  }

  /**
   * Create a collection of all elements that do not pass a given truth test.
   *
   * @param  {function|*}  callback
   * @return {\Kiirus\Support\Collection}
   */
  reject (callback) {
    if (this._useAsCallable(callback)) {
      return this.filter((value, key) => {
        return !callback(value, key)
      })
    }

    return this.filter((item) => {
      return item !== callback
    })
  }

  /**
   * Get the collection of items as a plain array.
   *
   * @return {array}
   */
  toArray () {
    return this._items.map((value) => {
      return Array.isArray(value) ? value.toArray() : value
    })
  }

  /**
   * Reset the keys on the underlying array.
   *
   * @return {\Kiirus\Support\Collection}
   */
  values () {
    return new this.constructor(Object.values(this._items))
  }

  /**
   * Results array of items from Collection or Arrayable.
   *
   * @param  {*}  items
   * @return {array}
   */
  valueOf (items) {
    if (Array.isArray(items) === true) {
      return items
    } else if (items instanceof Collection) {
      return items.all()
    } else if (Helper.isObject(items) === true) {
      return items
    }

    return items ? [items] : []
  }
}
