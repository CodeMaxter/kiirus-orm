'use strict'

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

  /**
   * Get all of the items in the collection.
   *
   * @return {array}
   */
  all () {
    return this._items
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
}
